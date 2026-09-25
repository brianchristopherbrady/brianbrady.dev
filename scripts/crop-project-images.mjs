import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const crops = [
  ["blipmap_route.png", "blipmap-route-detail.jpg", [0.15, 0.035, 0.84, 0.485]],
  ["blipmap_dialog.png", "blipmap-evidence-detail.jpg", [0.359, 0.008, 0.282, 0.244]],
  ["blipmap_tooltip.png", "blipmap-cluster-detail.jpg", [0.43, 0.235, 0.22, 0.12]],
  ["elsewhere_landingpage.png", "elsewhere-identity-detail.jpg", [0.02, 0.015, 0.96, 0.26]],
  ["elsewhere_filtering.png", "elsewhere-filter-detail.jpg", [0.02, 0, 0.94, 0.49]],
  ["elsewhere_dayplanner.png", "elsewhere-itinerary-detail.jpg", [0.028, 0.657, 0.565, 0.275]],
  ["elsewhere_homescreen_default_theme_fullpage.jpeg", "elsewhere-discovery-detail.jpg", [0.02, 0.43, 0.73, 0.28]],
  ["elsewhere_daymap_theme_civic_darkmode.jpeg", "elsewhere-map-detail.jpg", [0.02, 0.21, 0.73, 0.355]],
  ["glyph_homescreen_fullpage.jpeg", "glyph-dashboard-detail.jpg", [0, 0, 1, 0.525]],
  ["glyph_machinestate_fullpage.jpeg", "glyph-plan-detail.jpg", [0.054, 0.205, 0.892, 0.238]],
  ["glyph_machinestate_fullpage.jpeg", "glyph-execution-detail.jpg", [0.054, 0.45, 0.892, 0.11]],
  ["glyph_machinestate_fullpage.jpeg", "glyph-account-detail.jpg", [0.054, 0.565, 0.892, 0.21]],
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(root, "index.html")).href);
  for (const [source, output, bounds] of crops) {
    const mimeType = source.endsWith(".png") ? "image/png" : "image/jpeg";
    const sourceUrl = `data:${mimeType};base64,${(await readFile(resolve(root, "static", source))).toString("base64")}`;
    const result = await page.evaluate(async ({ sourceUrl, bounds }) => {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const [left, top, width, height] = bounds.map(value => Math.round(value * image.naturalWidth));
      if (left + width > image.naturalWidth || top + height > image.naturalHeight) throw new Error("Crop exceeds source bounds");
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(1600, width);
      canvas.height = Math.round(canvas.width * height / width);
      canvas.getContext("2d").drawImage(image, left, top, width, height, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL("image/jpeg", 0.9).split(",")[1], width: canvas.width, height: canvas.height };
    }, { sourceUrl, bounds });
    assert(result.width > 0 && result.height > 0);
    await writeFile(resolve(root, "static", output), Buffer.from(result.data, "base64"));
    console.log(`${output}: ${result.width} x ${result.height}`);
  }
} finally {
  await browser.close();
}