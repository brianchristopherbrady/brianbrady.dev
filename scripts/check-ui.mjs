import assert from "node:assert/strict";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const routes = ["index.html", "projects.html", "art.html", "contact.html", "resume.html", "journal.html",
  ...(await readdir(resolve(root, "projects"))).filter(name => name.endsWith(".html")).map(name => `projects/${name}`)];
const selectedRoutes = process.argv.slice(2);
const testedRoutes = selectedRoutes.length ? routes.filter(route => selectedRoutes.includes(route)) : routes;
assert(testedRoutes.length, "Select at least one existing route");
const output = resolve(root, "dist/ui-checks");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const failures = [];
const scans = [];
let checks = 0;
page.on("pageerror", error => failures.push(`Runtime: ${error.message}`));

async function check(name, run) {
  try {
    await run();
    checks += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

async function assertReflow() {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert(dimensions.scroll <= dimensions.width + 1, JSON.stringify(dimensions));
}

try {
  for (const route of testedRoutes) {
    await page.goto(pathToFileURL(resolve(root, route)).href);
    await check(`${route} landmarks/assets/links`, async () => {
      assert.equal(await page.locator("main").count(), 1);
      assert.equal(await page.locator("h1").count(), 1);
      await page.locator("img").evaluateAll(images => Promise.all(images.map(image => {
        image.loading = "eager";
        return image.decode();
      })));
      const assets = await page.evaluate(() => [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src));
      assert.deepEqual(assets, []);
      for (const href of await page.locator("a[href]").evaluateAll(links => links.map(link => link.href))) {
        const url = new URL(href);
        if (url.protocol !== "file:") continue;
        assert(existsSync(fileURLToPath(url)), `Missing destination: ${href}`);
        if (url.hash && url.pathname === new URL(page.url()).pathname) {
          assert(await page.evaluate(id => !!document.getElementById(id), decodeURIComponent(url.hash.slice(1))), `Missing anchor: ${href}`);
        }
      }
    });
    for (const width of [320, 375, 600, 768, 1024, 1280, 1440, 1536, 1728]) {
      const height = ({ 320: 700, 375: 812, 768: 1024, 1024: 768, 1280: 800 })[width] || 900;
      await page.setViewportSize({ width, height });
      await check(`${route} reflow ${width}`, assertReflow);
      if (width === 375 || width === 1280) {
        if (route === "art.html") {
          await check(`${route} complete gallery and viewer ${width}`, async () => {
            const omitted = ["dude_colorpencil.PNG"]; // intentionally excluded from the displayed gallery
            const expected = (await readdir(resolve(root, "static/art"))).filter(name => /\.(png|jpe?g|webp|gif)$/i.test(name) && !omitted.includes(name)).sort();
            const links = page.locator(".art-gallery a");
            const actual = await links.evaluateAll(elements => elements.map(element => decodeURIComponent(new URL(element.href).pathname.split("/").pop())).sort());
            assert.deepEqual(actual, expected);
            await page.screenshot({ path: resolve(output, `art-gallery-${width}.png`), fullPage: true });
            await links.first().focus();
            await page.keyboard.press("Enter");
            const dialog = page.getByRole("dialog");
            assert(await dialog.isVisible());
            assert.equal(await page.locator(":focus").textContent(), "Close");
            await page.keyboard.press("Shift+Tab");
            assert.equal(await page.locator(":focus").textContent(), "Open original");
            await page.keyboard.press("Tab");
            assert.equal(await page.locator(":focus").textContent(), "Close");
            await page.keyboard.press("ArrowLeft");
            assert.equal(await page.locator("[data-art-position]").textContent(), `${expected.length} / ${expected.length}`);
            await dialog.getByRole("button", { name: "Next", exact: true }).click();
            assert.equal(await page.locator("[data-art-position]").textContent(), `1 / ${expected.length}`);
            await page.keyboard.press("ArrowRight");
            assert.equal(await page.locator("[data-art-position]").textContent(), `2 / ${expected.length}`);
            await dialog.getByRole("button", { name: "Previous", exact: true }).click();
            assert.equal(await page.locator("[data-art-original]").getAttribute("href"), await links.first().evaluate(element => element.href));
            await dialog.locator("img").evaluate(image => image.decode());
            assert.equal(await dialog.locator("img").getAttribute("alt"), await links.first().locator("img").getAttribute("alt"));
            assert(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1));
            const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
            assert.deepEqual(result.violations.map(issue => issue.id), []);
            await page.screenshot({ path: resolve(output, `art-viewer-${width}.png`) });
            await page.keyboard.press("Escape");
            assert(!(await dialog.isVisible()));
            assert(await links.first().evaluate(element => document.activeElement === element));
            assert(!(await page.locator("body").evaluate(element => element.classList.contains("art-viewer-open"))));
            await links.last().click();
            await dialog.getByRole("button", { name: "Close", exact: true }).click();
            assert(await links.last().evaluate(element => document.activeElement === element));
            await links.first().click();
            await page.mouse.click(0, 0);
            assert(!(await dialog.isVisible()));
            await page.evaluate(() => window.scrollTo(0, 0));
          });
        }
        const destinations = {
          "projects/astra-synastry.html": ["astra-synastry"],
          "projects/blipmap.html": ["blipmap", "https://brianchristopherbrady.github.io/blipmap/"],
          "projects/elsewhere.html": ["elsewhere", "https://brianchristopherbrady.github.io/elsewhere/"],
          "projects/glyph-rituals.html": [null, "https://www.glyph.trading"],
          "projects/signal-terminal.html": ["signal-terminal"],
          "projects/counterpart-assistant.html": ["counterpart-assistant"],
          "projects/mnemonic-weather-engine.html": ["Mnemonic-Weather-Engine"],
          "projects/certpilot.html": ["contractors"],
          "projects/handforge.html": ["collin"],
          "projects/our-american-gods.html": ["ouramericangods"],
          "projects/fluent-ui.html": ["https://github.com/microsoft/fluentui"],
          "projects/output-conductor.html": ["output-conductor", "https://brianchristopherbrady.github.io/output-conductor/"],
        }[route];
        if (destinations) {
          await check(`${route} compact project actions ${width}`, async () => {
            const actions = page.locator(".project-hero .project-actions");
            assert.equal(await actions.count(), 1);
            const [repository, site] = destinations;
            if (repository) {
              assert.equal(await actions.getByRole("link", { name: "View repo", exact: true }).getAttribute("href"), repository.startsWith("https:") ? repository : `https://github.com/brianchristopherbrady/${repository}`);
            }
            if (site) {
              const label = new URL(site).hostname.endsWith(".github.io") ? "View demo" : "Visit live site";
              assert.equal(await actions.getByRole("link", { name: label, exact: true }).getAttribute("href"), site);
            }
            for (const link of await page.locator(".project-actions a").all()) {
              const box = await link.boundingBox();
              assert(box.width < 260 && box.height >= 44 && box.height < 80, JSON.stringify(box));
              assert.equal(await link.getAttribute("target"), "_blank");
              assert.match(await link.getAttribute("rel"), /noopener/);
              assert.match(await link.getAttribute("rel"), /noreferrer/);
              if (new URL(await link.getAttribute("href")).hostname.endsWith(".github.io")) assert.equal(await link.textContent(), "View demo");
            }
            await actions.scrollIntoViewIfNeeded();
            await page.screenshot({ path: resolve(output, `actions-${route.replaceAll("/", "-")}-${width}.png`) });
            await page.evaluate(() => window.scrollTo(0, 0));
          });
        }
      }
      if (width === 1280) {
        await check(`${route} project heading allocation`, async () => {
          const cramped = await page.locator(".project-section-heading > div").evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().width < element.parentElement.getBoundingClientRect().width * 0.35).map(element => element.textContent));
          assert.deepEqual(cramped, []);
        });
      }
      if (["index.html", "projects.html", "contact.html", "journal.html", "projects/blipmap.html", "projects/elsewhere.html", "projects/glasshouse.html", "projects/counterpart-assistant.html", "projects/fabric-ux.html", "projects/fabric-ux-devkit.html", "projects/output-conductor.html"].includes(route)) {
        await page.screenshot({ path: resolve(output, `viewport-${route.replaceAll("/", "-")}-${width}.png`) });
      }
      if (width === 375 || width === 1280) {
        const gallerySources = {
          "projects/blipmap.html": [
            ["blipmap-route-detail.jpg", "blipmap_route.png", 924],
            ["blipmap-evidence-detail.jpg", "blipmap_dialog.png", 845, 976],
            ["blipmap-cluster-detail.jpg", "blipmap_tooltip.png", 460, 843],
          ],
          "projects/elsewhere.html": [
            ["elsewhere-filter-detail.jpg", "elsewhere_filtering.png", 834],
            ["elsewhere-identity-detail.jpg", "elsewhere_landingpage.png", 433],
            ["elsewhere-itinerary-detail.jpg", "elsewhere-itinerary-detail.jpg", 779],
            ["elsewhere-map-detail.jpg", "elsewhere_daymap_theme_civic_darkmode.jpeg", 778],
          ],
          "projects/glyph-rituals.html": [
            ["glyph-dashboard-detail.jpg", "glyph_homescreen_fullpage.jpeg", 840],
            ["glyph-plan-detail.jpg", "glyph_machinestate_fullpage.jpeg", 427],
            ["glyph-execution-detail.jpg", "glyph_machinestate_fullpage.jpeg", 197],
            ["glyph-account-detail.jpg", "glyph_machinestate_fullpage.jpeg", 377],
          ],
        }[route];
        if (gallerySources) {
          await check(`${route} screenshot galleries ${width}`, async () => {
            assert.equal(await page.locator(".project-gallery img").count(), gallerySources.length);
            for (const [asset, source, height, imageWidth = 1600] of gallerySources) {
              const image = page.locator(`.project-gallery img[src='../static/${asset}']`);
              await image.evaluate(element => element.decode());
              assert.deepEqual(await image.evaluate(element => [element.naturalWidth, element.naturalHeight]), [imageWidth, height]);
              const link = page.locator(".project-gallery a").filter({ has: page.locator(`img[src='../static/${asset}']`) });
              assert.equal(await link.getAttribute("href"), `../static/${source}`);
              assert.match(await link.getAttribute("aria-label"), /full-resolution/);
              await image.evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 160));
              const ratio = await image.evaluate(element => element.getBoundingClientRect().width / element.getBoundingClientRect().height);
              assert(Math.abs(ratio - imageWidth / height) < 0.02, `Distorted gallery image: ${asset}`);
              await assertReflow();
              await page.screenshot({ path: resolve(output, `gallery-${asset}-${width}.png`) });
            }
          });
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        await check(`${route} axe ${width}`, async () => {
          const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
          scans.push({ route, width, violations: result.violations, incomplete: result.incomplete });
          assert.deepEqual(result.violations.map(issue => ({ id: issue.id, targets: issue.nodes.map(node => node.target) })), []);
          assert.deepEqual(result.incomplete.filter(issue => issue.id === "aria-prohibited-attr").map(issue => issue.nodes.map(node => node.target)), []);
        });
        if (["index.html", "projects.html", "contact.html", "projects/fabric-ux.html", "projects/glyph-rituals.html", "resume.html"].includes(route)) {
          await page.screenshot({ path: resolve(output, `${route.replaceAll("/", "-")}-${width}.png`), fullPage: true });
        }
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await check(`${route} enlarged text and long content`, async () => {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
        const heading = document.querySelector("h1");
        heading.textContent += " ExtendedContentWithoutBreaks".repeat(3);
      });
      await assertReflow();
    });
    await page.reload();
    await check(`${route} text spacing`, async () => {
      await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }" });
      await assertReflow();
    });
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 900 });
    await check(`${route} enlarged diagram overlap`, async () => {
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const overlaps = await page.locator(".migration-node, .migration-center").evaluateAll(elements => elements.flatMap((element, index) => elements.slice(index + 1).filter(other => {
        const first = element.getBoundingClientRect();
        const second = other.getBoundingClientRect();
        return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
      }).map(other => [element.className, other.className])));
      assert.deepEqual(overlaps, []);
      await assertReflow();
    });
    await page.reload();
    await page.setViewportSize({ width: 375, height: 812 });
    if (route !== "resume.html") {
      await check(`${route} skip and keyboard focus`, async () => {
        await page.keyboard.press("Tab");
        assert.equal(await page.locator(":focus").textContent(), "Skip to content");
        assert.equal(await page.locator(":focus").evaluate(element => getComputedStyle(element).outlineStyle), "solid");
        await page.keyboard.press("Enter");
        assert(await page.locator("main").evaluate(element => element === document.activeElement));
        assert.equal(await page.locator("nav [aria-current]").count(), 1);
        const targets = await page.locator("nav a, .button, .case-link, .motion-toggle").evaluateAll(elements => elements.filter(element => element.offsetParent !== null && element.getBoundingClientRect().height < 44).map(element => element.outerHTML));
        assert.deepEqual(targets, []);
      });
    }
    await page.setViewportSize({ width: 812, height: 375 });
    await check(`${route} landscape`, assertReflow);
    console.log(`Checked ${route}`);
  }

  await check("portfolio project list and resume", async () => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(pathToFileURL(resolve(root, "index.html")).href);
    assert.match(await page.locator("h1").textContent(), /Brian Brady/);
    assert(await page.locator(".site-header").evaluate(element => element.getBoundingClientRect().height < 140));
    await page.locator("#work a[href='./projects/output-conductor.html']").click();
    assert.match(page.url(), /output-conductor\.html$/);
    await page.goBack();
    await page.getByRole("link", { name: "Resume", exact: true }).click();
    assert.match(page.url(), /resume\.html$/);
    await page.goBack();
    assert.equal(await page.locator("#contact a.primary").getAttribute("href"), "mailto:brdybrn@gmail.com");
  });

  await check("equal project lists", async () => {
    const expected = routes.filter(route => route.startsWith("projects/")).map(route => `./${route}`).sort();
    let firstOrder;
    for (const route of ["index.html", "projects.html"]) {
      await page.goto(pathToFileURL(resolve(root, route)).href);
      assert.equal(await page.locator(".preview-grid, .project-index-feature, .project-index-grid, .feature-case, .platform-note").count(), 0);
      const rows = page.locator(".work-section .case-study");
      assert.equal(await rows.count(), expected.length);
      assert.equal(await page.locator("main a[href^='./projects/']").count(), expected.length);
      assert.equal(await rows.locator("img").count(), 0);
      const links = await rows.locator("a.case-link").evaluateAll(elements => elements.map(element => element.getAttribute("href")));
      assert.deepEqual([...links].sort(), expected);
      if (firstOrder) assert.deepEqual(links, firstOrder);
      firstOrder = links;
      assert.deepEqual(await rows.locator(".case-index").allTextContents(), expected.map((_, index) => String(index + 1).padStart(2, "0")));
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await rows.first().evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 150));
        await assertReflow();
        await page.screenshot({ path: resolve(output, `equal-list-${route}-${width}.png`) });
      }
    }
  });

  await check("new projects and journal journeys", async () => {
    for (const slug of ["blipmap", "elsewhere", "glasshouse", "counterpart-assistant"]) {
      for (const route of ["index.html", "projects.html"]) {
        await page.goto(pathToFileURL(resolve(root, route)).href);
        await page.locator(`a[href='./projects/${slug}.html']`).first().click();
        assert.match(page.url(), new RegExp(`/projects/${slug}\\.html$`));
        await page.getByRole("link", { name: "Read the journal note", exact: true }).click();
        assert.equal(new URL(page.url()).hash, `#${slug}`);
        assert.equal(await page.locator(`#${slug}`).count(), 1);
        await page.locator(`#${slug} a.case-link`).click();
        assert.match(page.url(), new RegExp(`/projects/${slug}\\.html$`));
      }
    }
  });

  await check("project/contact journey", async () => {
    await page.goto(pathToFileURL(resolve(root, "index.html")).href);
    await page.getByRole("link", { name: "Projects", exact: true }).first().click();
    await page.locator(".case-study a[href='./projects/fabric-ux.html']").click();
    assert.match(await page.locator("h1").textContent(), /Fabric UX/);
    await page.getByRole("link", { name: "Contact", exact: true }).click();
    assert.equal(await page.getByRole("link", { name: "brdybrn@gmail.com" }).getAttribute("href"), "mailto:brdybrn@gmail.com");
  });

  await check("motion preferences and persistence", async () => {
    await page.goto(pathToFileURL(resolve(root, "index.html")).href);
    assert.equal(await page.locator("html").evaluate(element => getComputedStyle(element).getPropertyValue("--color-accent").trim()), "#a78bfa");
    assert.equal(await page.locator(".hero-motion-field .scope span").count(), 4);
    assert.equal(await page.locator(".practice-marquee").getAttribute("aria-hidden"), "true");
    assert.equal(await page.locator(".hero-motion-field .scope span").first().evaluate(element => getComputedStyle(element).animationPlayState), "paused");
    assert.equal(await page.locator("html").getAttribute("data-motion"), "paused");
    assert(await page.getByLabel("Pause motion").isDisabled());
    const pausedCanvas = await page.locator("canvas").evaluate(canvas => canvas.toDataURL());
    await page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
    assert.equal(await page.locator("canvas").evaluate(canvas => canvas.toDataURL()), pausedCanvas);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => document.documentElement.dataset.motion === "running");
    for (const selector of [".hero-motion-field .scope span", ".practice-marquee-track"]) {
      const animated = page.locator(selector).first();
      const initial = await animated.evaluate(element => getComputedStyle(element).transform);
      await page.waitForFunction(({ selector, initial }) => getComputedStyle(document.querySelector(selector)).transform !== initial, { selector, initial });
      assert.equal(await animated.evaluate(element => getComputedStyle(element).animationPlayState), "running");
    }
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: resolve(output, `restored-home-running-${width}.png`) });
    }
    const runningCanvas = await page.locator("canvas").evaluate(canvas => canvas.toDataURL());
    await page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
    assert.notEqual(await page.locator("canvas").evaluate(canvas => canvas.toDataURL()), runningCanvas);
    assert(await page.locator("canvas").evaluate(canvas => canvas.getContext("2d").getImageData(0, 0, 20, 20).data.some(value => value !== 0)));
    await page.getByLabel("Pause motion").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("html").getAttribute("data-motion"), "paused");
    await page.reload();
    assert.equal(await page.locator(".practice-marquee-track").evaluate(element => getComputedStyle(element).animationPlayState), "paused");
    assert(await page.getByLabel("Pause motion").isChecked());
    await page.getByLabel("Pause motion").uncheck();
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("data-motion"), "running");
  });

  await check("forced colors and RTL", async () => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 700 });
    await page.evaluate(() => { document.documentElement.dir = "rtl"; });
    await assertReflow();
    await page.locator("nav a").first().focus();
    assert.equal(await page.locator(":focus").evaluate(element => getComputedStyle(element).outlineStyle), "solid");
    const primary = await page.locator(".button.primary").first().evaluate(element => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor, adjustment: style.forcedColorAdjust };
    });
    assert.notEqual(primary.color, primary.background);
    assert.equal(primary.adjustment, "none");
    for (const image of await page.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(element => element.decode());
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: resolve(output, "forced-colors-rtl.png"), fullPage: true });
    await page.emulateMedia({ forcedColors: "none" });
  });

  await check("resume print geometry", async () => {
    await page.goto(pathToFileURL(resolve(root, "resume.html")).href);
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await page.evaluate(() => [...document.fonts].map(font => ({ family: font.family, status: font.status }))), [
      { family: "Resume Roboto", status: "loaded" },
      { family: "Resume Roboto Mono", status: "loaded" },
    ]);
    assert.deepEqual(await page.locator("main section > h2").allTextContents(), ["Summary", "Experience", "Education", "Skills"]);
    assert.equal(await page.locator(".role").count(), 8);
    assert.match(await page.locator(".role").first().innerText(), /Principal AI Solutions Architect.*GISTIC Research/);
    assert.match(await page.locator(".role").nth(1).innerText(), /May 2023 - June 2026/);
    assert.equal(await page.locator("iframe, embed, object, a[href$='.pdf']").count(), 0);
    assert.equal(await page.locator("h1").evaluate(element => getComputedStyle(element).color), "rgb(16, 129, 140)");
    await page.setViewportSize({ width: 816, height: 1056 });
    await page.emulateMedia({ media: "print" });
    const width = await page.locator(".page").evaluate(element => element.getBoundingClientRect().width);
    assert.equal(width, 816);
    assert.equal(await page.locator(".page").evaluate(element => getComputedStyle(element).padding), "0px");
    await page.pdf({ path: resolve(output, "resume.pdf"), preferCSSPageSize: true });
  });

  const noScript = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "no-preference", viewport: { width: 320, height: 700 } });
  const staticPage = await noScript.newPage();
  await check("no-JavaScript navigation", async () => {
    await staticPage.goto(pathToFileURL(resolve(root, "index.html")).href);
    assert(await staticPage.getByRole("link", { name: "Skip to content" }).count());
    await staticPage.getByRole("link", { name: "Projects", exact: true }).first().click();
    assert.match(await staticPage.title(), /Projects/);
    assert(await staticPage.locator(".motion-toggle").isHidden());
  });
  await noScript.close();
} finally {
  await writeFile(resolve(output, "results.json"), JSON.stringify({ browser: browser.version(), checks, failures, scans }, null, 2));
  await browser.close();
}

console.log(`${checks} checks passed; ${failures.length} failed. Evidence: dist/ui-checks/`);
for (const failure of failures) console.error(failure);
process.exitCode = failures.length ? 1 : 0;