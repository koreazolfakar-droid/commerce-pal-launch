import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../src/lib/heroDesign.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const {
  normalizeHeroVisualConfig: normalize,
  moveHeroPoint,
  defaultHeroLayout,
} = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
test("legacy slides retain their layout without enabling free placement", () => {
  assert.deepEqual(normalize(null), {
    vertical: "bottom",
    titleSize: "standard",
    contentWidth: "standard",
    buttonRadius: "rounded",
  });
  assert.equal(
    normalize({ vertical: "top", contentWidth: "wide" }).vertical,
    "top",
  );
});
test("device layouts, placement and focus survive a JSON save/read round trip", () => {
  const original = normalize({
    buttonPlacement: "below",
    desktopLayout: { content: { x: 10, y: 20 }, buttons: { x: 80, y: 90 } },
    mobileLayout: { content: { x: 50, y: 5 }, buttons: { x: 50, y: 100 } },
    focalPoint: { x: 20, y: 30 },
    mobileFocalPoint: { x: 65, y: 45 },
  });
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(original))), original);
  assert.notDeepEqual(original.desktopLayout, original.mobileLayout);
});
test("malformed configuration cannot create unbounded positions or inject CSS", () => {
  const result = normalize({
    buttonPlacement: "url(javascript:bad)",
    desktopLayout: {
      content: { x: -90, y: 999 },
      buttons: { x: NaN, y: Infinity },
    },
    mobileLayout: { content: { x: "50%", y: 0 } },
    focalPoint: { x: 200, y: -20 },
    mobileFocalPoint: { x: -10, y: 140 },
  });
  assert.equal(result.buttonPlacement, undefined);
  assert.equal(result.mobileLayout, undefined);
  assert.deepEqual(result.desktopLayout, {
    content: { x: 0, y: 100 },
    buttons: { x: 50, y: 50 },
  });
  assert.deepEqual(result.focalPoint, { x: 100, y: 0 });
  assert.deepEqual(result.mobileFocalPoint, { x: 0, y: 100 });
});
test("touch and mouse drag use remaining canvas space and clamp every edge", () => {
  assert.deepEqual(moveHeroPoint({ x: 50, y: 50 }, 100, -50, 200, 100), {
    x: 100,
    y: 0,
  });
  assert.deepEqual(moveHeroPoint({ x: 50, y: 50 }, 9999, -9999, 200, 100), {
    x: 100,
    y: 0,
  });
  assert.deepEqual(moveHeroPoint({ x: 50, y: 50 }, 20, 20, 0, 0), {
    x: 50,
    y: 50,
  });
  assert.deepEqual(moveHeroPoint({ x: 45, y: 50 }, 4, 0, 100, 100), {
    x: 50,
    y: 50,
  });
});
test("new device layouts have independent default positions", () => {
  const config = normalize({ vertical: "top" });
  const one = defaultHeroLayout(config, "center"),
    two = defaultHeroLayout(config, "center");
  one.content.x = 0;
  assert.equal(two.content.x, 50);
  assert.equal(two.content.y, 0);
});
