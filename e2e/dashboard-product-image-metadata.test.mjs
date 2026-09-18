import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const media = await readFile(
  new URL("../src/dashboard/components/products/ProductMediaManager.tsx", import.meta.url),
  "utf8",
);
const processing = await readFile(
  new URL("../src/dashboard/lib/imageProcessing.ts", import.meta.url),
  "utf8",
);
const catalog = await readFile(
  new URL("../src/dashboard/data/catalog.ts", import.meta.url),
  "utf8",
);

test("product media shows real dimensions and bytes before and after upload", () => {
  assert.match(media, /Before upload/);
  assert.match(media, /After upload/);
  assert.match(media, /source\.width/);
  assert.match(media, /source\.height/);
  assert.match(media, /output\.width/);
  assert.match(media, /output\.height/);
  assert.match(media, /formatBytes\(source\.bytes\)/);
  assert.match(media, /formatBytes\(output\.bytes\)/);
});

test("product media reads actual dimensions for stored images", () => {
  assert.match(media, /naturalWidth/);
  assert.match(media, /naturalHeight/);
  assert.match(media, /content-length/);
  assert.match(media, /Actual:/);
});

test("WebP conversion returns source and output metadata", () => {
  assert.match(processing, /ProductImageConversionResult/);
  assert.match(processing, /inspectProductImageSource/);
  assert.match(processing, /source: sourceInfo/);
  assert.match(processing, /bytes: file\.size/);
  assert.match(catalog, /conversion: uploaded\.conversion/);
});
