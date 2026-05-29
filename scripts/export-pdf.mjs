import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const usage = `Usage:
  npm run export:pdf -- [input.html|url] [output.pdf]

Examples:
  npm run export:pdf -- index.html dist/index.pdf
  npm run export:pdf -- contact.html dist/contact.pdf
  npm run export:pdf -- https://brianbrady.dev dist/site.pdf`;

const [input = "index.html", output = "dist/index.pdf"] = process.argv.slice(2);

if (input === "--help" || input === "-h") {
  console.log(usage);
  process.exit(0);
}

function toPageUrl(value) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return pathToFileURL(path.resolve(value)).href;
}

const outputPath = path.resolve(output);
await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: {
    width: 1280,
    height: 1600,
  },
});

try {
  await page.goto(toPageUrl(input), { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });

  await page.pdf({
    path: outputPath,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: "0.5in",
      right: "0.5in",
      bottom: "0.5in",
      left: "0.5in",
    },
  });

  console.log(`Exported ${input} to ${path.relative(process.cwd(), outputPath)}`);
} finally {
  await browser.close();
}
