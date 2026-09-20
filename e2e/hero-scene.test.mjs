import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": new URL("../src", import.meta.url).pathname } },
});
const { HeroScene } = await server.ssrLoadModule(
  "/src/components/HeroScene.tsx",
);
const slide = {
  id: "test",
  title: "Space Call",
  subtitle: "New arrivals",
  image_url: "https://example.com/desktop.webp",
  mobile_image_url: "https://example.com/mobile.webp",
  button_label: "Shop now",
  target_type: "url",
  target_value: "/shop",
  sort_order: 0,
};
const render = (patch) =>
  renderToStaticMarkup(
    createElement(HeroScene, { slide: { ...slide, ...patch }, language: "en" }),
  );
test("shared scene renders responsive artwork and preserves safe CTA destinations", () => {
  const html = render({ open_in_new_tab: true });
  assert.match(html, /srcSet="https:\/\/example.com\/mobile.webp"/);
  assert.match(html, /href="\/shop"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Space Call/);
});
test("below-hero action is outside the image canvas and not duplicated", () => {
  const html = render({ visual_config: { buttonPlacement: "below" } });
  assert.match(html, /class="hero-scene-below"/);
  assert.equal((html.match(/href="\/shop"/g) ?? []).length, 1);
  assert.ok(
    html.indexOf("hero-scene-below") > html.indexOf("home-hero-content"),
  );
});
test("free buttons and independent layouts render bounded positions", () => {
  const html = render({
    visual_config: {
      buttonPlacement: "free",
      desktopLayout: { content: { x: 20, y: 30 }, buttons: { x: 80, y: 90 } },
      mobileLayout: { content: { x: 50, y: 10 }, buttons: { x: 50, y: 100 } },
    },
  });
  assert.match(html, /data-hero-part="buttons"/);
  assert.match(html, /--hero-x:80%/);
  assert.match(html, /--hero-mx:50%/);
});
test("unsafe or absent destinations never render actionable buttons", () => {
  assert.doesNotMatch(render({ target_value: "javascript:alert(1)" }), /href=/);
  assert.doesNotMatch(render({ target_value: "//untrusted.example" }), /href=/);
  assert.doesNotMatch(render({ target_type: "none" }), /href=/);
});
test.after(async () => {
  await server.close();
});
