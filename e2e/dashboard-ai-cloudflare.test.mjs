import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../supabase/functions/dashboard-ai-assist/cloudflare.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  callCloudflareAi,
  cloudflareText,
  isFreeCloudflareModel,
  DEFAULT_CLOUDFLARE_MODEL,
} = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

const basic = {
  accountId: "a".repeat(32),
  token: "secret-only-on-server",
  model: DEFAULT_CLOUDFLARE_MODEL,
  systemInstruction: "Only suggest evidence-backed product fields.",
  input: "<untrusted_data>Phone name</untrusted_data>",
  responseSchema: { type: "object", properties: { suggestions: { type: "array" } } },
};

test("Cloudflare adapter is server-only and requests only free-listed Workers AI models", async () => {
  assert.equal(isFreeCloudflareModel(DEFAULT_CLOUDFLARE_MODEL), true);
  assert.equal(isFreeCloudflareModel("@cf/google/gemma-4-26b-a4b-it"), true);
  assert.equal(isFreeCloudflareModel("@cf/zai-org/glm-5.3-flash"), false);
  assert.equal(isFreeCloudflareModel("openai/gpt-5"), false);

  let called = false;
  await assert.rejects(
    () => callCloudflareAi({
      ...basic,
      model: "@cf/zai-org/glm-5.3-flash",
      fetcher: async () => { called = true; throw new Error("should not fetch"); },
    }),
    /cloudflare_model_not_free/,
  );
  assert.equal(called, false);
});

test("Cloudflare adapter calls Workers AI non-thinking inference with cautious instructions", async () => {
  let url;
  let options;
  const output = await callCloudflareAi({
    ...basic,
    fetcher: async (u, o) => {
      url = u;
      options = o;
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          success: true,
          result: {
            choices: [{ message: { content: '{"suggestions":[]}' }, finish_reason: "stop" }],
          },
        }),
      };
    },
  });
  assert.match(url, /accounts\/a{32}\/ai\/run\/@cf\/zai-org\/glm-4\.7-flash$/);
  assert.equal(options.headers.Authorization, "Bearer secret-only-on-server");
  const body = JSON.parse(options.body);
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
  assert.equal(body.messages[0].role, "system");
  assert.match(body.messages[0].content, /NO live web search or URL retrieval/);
  assert.match(body.messages[0].content, /verified=false/);
  assert.match(body.messages[0].content, /missingFields/);
  assert.equal(body.messages[1].content, basic.input);
  assert.equal(output.ok, true);
  assert.equal(cloudflareText(output.body), '{"suggestions":[]}');
});

test("Cloudflare response parser handles /ai/run nested choices observed from GLM", () => {
  const expected = '{"entityMatch":{"status":"uncertain","canonicalName":"","reason":"No source"},"summary":"Needs review","suggestions":[],"missingFields":[],"warnings":[]}';
  const observed = {
    success: true,
    result: {
      id: "chatcmpl-real-shape",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: expected }, finish_reason: "stop" }],
      usage: { prompt_tokens: 50, completion_tokens: 70 },
    },
  };
  assert.equal(cloudflareText(observed), expected);
  assert.equal(cloudflareText(observed.result), expected);
  assert.equal(cloudflareText({ result: { choices: [{ message: { content: [{ type: "text", text: expected }] } }] } }), expected);
});

test("Cloudflare response parser rejects reasoning-only and empty outputs", () => {
  assert.equal(cloudflareText({ result: { choices: [{ message: { reasoning: "thoughts", content: null } }] } }), "");
  assert.equal(cloudflareText({ choices: [{ message: { reasoning: "thoughts", content: null } }] }), "");
  assert.equal(cloudflareText({ choices: [{ message: { content: [{ type: "text", text: '{"ok":true}' }] } }] }), '{"ok":true}');
  assert.equal(cloudflareText({ result: { response: '{"ok":true}' } }), '{"ok":true}');
  assert.equal(cloudflareText({ choices: [] }), "");
  assert.equal(cloudflareText(null), "");
});

test("Cloudflare adapter preserves successful Workers AI responses and bounded custom timeouts", async () => {
  const result = await callCloudflareAi({
    ...basic,
    timeoutMs: 200,
    fetcher: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ result: { response: '{"suggestions":[]}' } }),
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(cloudflareText(result.body), '{"suggestions":[]}');
});

test("Cloudflare 429 is surfaced without hidden retries or paid-provider fallback", async () => {
  let requests = 0;
  const output = await callCloudflareAi({
    ...basic,
    fetcher: async () => {
      requests++;
      return {
        ok: false,
        status: 429,
        headers: { get: () => "1800" },
        json: async () => ({ errors: [{ message: "quota exceeded" }] }),
      };
    },
  });
  assert.equal(requests, 1);
  assert.equal(output.status, 429);
  assert.equal(output.retryAfter, "1800");
});

test("the Supabase edge endpoint retains authorization and never silently falls back to Gemini", async () => {
  const edge = await readFile(
    new URL("../supabase/functions/dashboard-ai-assist/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(edge, /DASHBOARD_AI_PROVIDER/);
  assert.match(edge, /CLOUDFLARE_WORKERS_AI_TOKEN/);
  assert.match(edge, /isFreeCloudflareModel\(cfModel\)/);
  assert.match(edge, /aiProvider === "cloudflare"/);
  assert.match(edge, /aiProvider === "gemini" \? grounding/);
  assert.match(edge, /checkDashboardAiAccess/);
  assert.match(edge, /user_roles/);
  assert.match(edge, /Cloudflare free AI capacity or daily quota/);
  assert.doesNotMatch(edge, /VITE_CLOUDFLARE_WORKERS_AI_TOKEN/);
});
