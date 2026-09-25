import assert from "node:assert/strict";
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  for (const [slug, selector] of [["signal-terminal", ".signal-terminal-window"], ["handforge", ".handforge-board"]]) {
    await page.goto(pathToFileURL(resolve(root, `projects/${slug}.html`)).href);
    await page.addStyleTag({ content: ".site-header { position: static !important; } .noise, .ambient-grid, #signal-field { display: none !important; } .project-layout { grid-template-columns: 1fr !important; } .signal-terminal-window, .handforge-board { box-sizing: border-box; width: 800px; height: 500px; padding: 32px; background: #141716; border: 0; } .handforge-board { display: grid; align-content: center; gap: 32px; } .signal-terminal-window { display: flex; flex-direction: column; justify-content: space-between; }" });
    const illustration = page.locator(selector);
    await illustration.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      element.style.transform = `translate(${Math.ceil(bounds.left) - bounds.left}px, ${Math.ceil(bounds.top) - bounds.top}px)`;
    });
    const bounds = await illustration.boundingBox();
    assert(bounds && bounds.width > 0 && bounds.height > 0, `${slug} illustration must render`);
    await illustration.screenshot({ path: resolve(root, `static/${slug}-preview.png`) });
    console.log(`Captured ${slug}: ${Math.round(bounds.width)} x ${Math.round(bounds.height)}`);
  }
} finally {
  await browser.close();
}