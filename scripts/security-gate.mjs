import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, basename } from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirs = new Set([
  ".git", "node_modules", "dist", ".output", ".nitro", "coverage", ".cache", ".vercel"
]);
const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".avif",
  ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".mov", ".zip", ".gz", ".pdf"
]);

const secretRules = [
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{70,255}\b/g],
  ["Stripe live secret", /\bsk_live_[A-Za-z0-9]{20,}\b/g],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  [
    "Supabase service-role JWT literal",
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'`]eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  ],
];

const productionRules = [
  ["eval()", /\beval\s*\(/g],
  ["new Function()", /\bnew\s+Function\s*\(/g],
  ["document.write()", /\bdocument\.write\s*\(/g],
  ["Node child_process", /(?:node:)?child_process/g],
];

const findings = [];
let filesScanned = 0;

function lineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function addFinding(path, rule, index, text) {
  findings.push({ path, rule, line: lineNumber(text, index) });
}

function isProductionCode(path) {
  return path.startsWith("src/") || path.startsWith("supabase/functions/");
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const rel = relative(root, full).replaceAll("\\", "/");

    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!entry.isFile() || binaryExtensions.has(extname(entry.name).toLowerCase())) continue;

    const info = await stat(full);
    if (info.size > 2_000_000) continue;

    if (
      basename(rel).startsWith(".env") &&
      !/(?:example|sample|template)/i.test(basename(rel))
    ) {
      findings.push({ path: rel, rule: "Committed environment file", line: 1 });
    }

    let text;
    try {
      text = await readFile(full, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\u0000")) continue;
    filesScanned += 1;

    for (const [rule, regex] of secretRules) {
      regex.lastIndex = 0;
      for (const match of text.matchAll(regex)) addFinding(rel, rule, match.index ?? 0, text);
    }

    if (isProductionCode(rel)) {
      for (const [rule, regex] of productionRules) {
        regex.lastIndex = 0;
        for (const match of text.matchAll(regex)) addFinding(rel, rule, match.index ?? 0, text);
      }

      if (
        rel.startsWith("src/") &&
        !/\.server\.[cm]?[jt]sx?$/.test(rel) &&
        text.includes("SUPABASE_SERVICE_ROLE_KEY")
      ) {
        addFinding(
          rel,
          "Service-role secret referenced from non-server frontend source",
          text.indexOf("SUPABASE_SERVICE_ROLE_KEY"),
          text,
        );
      }
    }
  }
}

await walk(root);

if (findings.length > 0) {
  console.error(`Security gate blocked: ${findings.length} high-confidence finding(s).`);
  for (const finding of findings) {
    console.error(`- ${finding.path}:${finding.line} [${finding.rule}]`);
  }
  console.error("Secret values are intentionally redacted from CI output.");
  process.exit(1);
}

console.log(`Repository security scan passed (${filesScanned} text files checked).`);
