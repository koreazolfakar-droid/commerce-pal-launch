import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function readTypeScript(relative) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const compiled = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
  return compiled;
}

const { safeStoreHref, safeHttpsUrl } = await readTypeScript("../src/lib/safeUrl.ts");
const { exceedsMutationBodyLimit } = await readTypeScript("../src/security/request-body-limit.server.ts");

function streamedRequest(text, headerLength) {
  const bytes = new TextEncoder().encode(text);
  const split = Math.min(bytes.length, 24);
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, split));
      controller.enqueue(bytes.subarray(split));
      controller.close();
    },
  });
  return new Request("https://spacecallapp.store/dashboard/products", {
    method: "POST",
    body,
    duplex: "half",
    ...(headerLength ? { headers: { "Content-Length": headerLength } } : {}),
  });
}

test("CMS links reject URL parser backslash authority tricks and encoded controls", () => {
  for (const value of [
    "/\\evil.example", "/\\/evil.example", "/\\@evil.example",
    "/%5cevil.example", "/%0Aevil.example", "/%00evil.example",
    "//evil.example", "///evil.example", "https://user:pass@evil.example",
    "https:\\\\evil.example", "javascript:alert(1)",
    "http://example.com/\nX-Test: hi", 123, "", " ".repeat(5),
  ]) {
    assert.equal(safeStoreHref(value), null, "Rejected unsafe link " + String(value));
  }
});

test("ordinary product links, anchors and HTTPS URLs remain supported", () => {
  assert.equal(safeStoreHref("/product/samsung-galaxy"), "/product/samsung-galaxy");
  assert.equal(safeStoreHref("/shop?brand=Samsung#latest"), "/shop?brand=Samsung#latest");
  assert.equal(safeStoreHref("#overview"), "#overview");
  assert.equal(safeStoreHref("https://www.samsung.com/lb/"), "https://www.samsung.com/lb/");
  // Preserve previously supported partner URLs rather than breaking old CMS content.
  assert.equal(safeStoreHref("http://example.com/catalog"), "http://example.com/catalog");
  assert.equal(safeHttpsUrl("http://example.com/"), null);
  assert.equal(safeHttpsUrl("https://example.com/"), "https://example.com/");
});

test("unknown Content-Length streaming requests are limited by real bytes", async () => {
  const exactlyAtLimit = streamedRequest("x".repeat(1024));
  assert.equal(await exceedsMutationBodyLimit(exactlyAtLimit, 1024), false);
  assert.equal((await exactlyAtLimit.text()).length, 1024, "Original body is available to SSR");

  const oversized = streamedRequest("x".repeat(1025));
  assert.equal(await exceedsMutationBodyLimit(oversized, 1024), true);
  assert.equal((await oversized.text()).length, 1025, "Check must not consume original body");
});

test("a forged short Content-Length cannot skip the streamed byte cap", async () => {
  const req = streamedRequest("x".repeat(600), "1");
  assert.equal(req.headers.get("content-length"), "1");
  assert.equal(await exceedsMutationBodyLimit(req, 512), true);
  assert.equal((await req.text()).length, 600);
});

test("empty mutation request bodies remain valid", async () => {
  const req = new Request("https://spacecallapp.store/dashboard", { method: "POST" });
  assert.equal(await exceedsMutationBodyLimit(req, 1), false);
});

test("SSR enforces body limits and private cache policy before returning", async () => {
  const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
  assert.match(server, /await exceedsMutationBodyLimit\(request, MAX_REQUEST_BYTES\)/);
  assert.match(server, /securityError\(413, "Request body is too large"\)/);
  assert.match(server, /function withSensitiveResponseNoStore\(request: Request, response: Response\)/);
  assert.match(server, /MUTATING_METHODS\.has\(request\.method\.toUpperCase\(\)\)/);
  assert.match(server, /request\.headers\.has\("authorization"\)/);
  assert.match(server, /response\.headers\.has\("set-cookie"\)/);
  assert.match(server, /"Cache-Control", "private, no-store, max-age=0, must-revalidate"/);
  assert.match(server, /"CDN-Cache-Control", "no-store"/);
  assert.match(server, /if \(hostRedirect\) return withSecurityHeaders\(hostRedirect\)/);
  assert.match(server, /url\.pathname !== "\/dashboard" && !url\.pathname\.startsWith\("\/dashboard\/"\)/);
});
