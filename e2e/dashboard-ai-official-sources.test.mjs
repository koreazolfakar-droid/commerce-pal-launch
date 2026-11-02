import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

async function compiled(path, requireImpl = () => ({})) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports, require: requireImpl,
    URL, URLSearchParams, AbortController, TextDecoder, Uint8Array,
    setTimeout, clearTimeout, fetch,
  });
  return module.exports;
}
const identity = await compiled("../supabase/functions/dashboard-ai-assist/modelIdentity.ts");
const { officialProductResearch, sourceContainsExactValue } = await compiled(
  "../supabase/functions/dashboard-ai-assist/researchSources.ts",
  () => identity,
);
const html = (title, body = "") =>
  "<html><head><title>" + title + "</title></head><body>" + body + "</body></html>";
const response = (title) => new Response(html(title, "Samsung Galaxy A57 5G with 5000 mAh battery"), {
  status: 200, headers: { "content-type": "text/html" },
});

test("official Samsung A57 page is retrieved without an external search key", async () => {
  const calls = [];
  const pages = await officialProductResearch({
    query: "Samsung A57",
    referenceUrls: ["https://www.samsung.com/lb/smartphones/galaxy-a/galaxy-a57-5g/"],
    fetcher: async (url, args) => {
      calls.push([url, args.redirect]);
      return response("Samsung Galaxy A57 5G");
    },
  });
  assert.equal(pages.length, 1);
  assert.equal(pages[0].url, calls[0][0]);
  assert.equal(calls[0][1], "manual");
  assert.match(pages[0].content, /5000 mAh/);
});

test("wrong model, non-official URL, IP URLs, redirects and HTTP are never treated as verified", async () => {
  let requests = 0;
  const fetcher = async () => { requests++; return response("Samsung Galaxy A55 5G"); };
  const pages = await officialProductResearch({
    query: "Samsung A57",
    referenceUrls: ["http://127.0.0.1/path", "https://evil.example/", "https://www.samsung.com/lb/galaxy-a55/"],
    fetcher,
  });
  assert.equal(requests, 1);
  assert.equal(pages.length, 0);
});

test("optional Brave discovery resolves only matching manufacturer results", async () => {
  const calls = [];
  const pages = await officialProductResearch({
    query: "Samsung A57",
    referenceUrls: [],
    braveKey: "server-secret",
    fetcher: async (url, args) => {
      calls.push([url, args]);
      if (url.startsWith("https://api.search.brave.com/")) return new Response(JSON.stringify({
        web: { results: [
          { title: "Samsung Galaxy A55 5G", url: "https://www.samsung.com/lb/a55/" },
          { title: "Samsung Galaxy A57 5G", url: "https://www.samsung.com/lb/a57/" },
          { title: "Example phone A57", url: "https://evil.example/a57/" },
        ] },
      }), { status: 200, headers: { "content-type": "application/json" } });
      return response("Samsung Galaxy A57 5G");
    },
  });
  assert.equal(pages.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].headers["X-Subscription-Token"], "server-secret");
  assert.equal(calls[1][1].headers["X-Subscription-Token"], undefined);
});

test("literal verification prevents GB substring fraud", () => {
  assert.equal(sourceContainsExactValue("128 GB storage", "8 GB"), false);
  assert.equal(sourceContainsExactValue("5000 mAh battery", "5000 mAh"), true);
  assert.equal(sourceContainsExactValue("5000 mAh battery", "6000 mAh"), false);
});
