# brianbrady.dev

Static portfolio site for Brian Brady.

## What is in here

- `index.html` - the page structure and portfolio content.
- `styles.css` - the visual system, responsive layout, and strange-web treatment.
- `script.js` - animated canvas signal field and marquee behavior.
- `CNAME` - custom domain configuration for GitHub Pages.

## Design System

The shared CSS tokens, native HTML component contracts, responsive recipes, migration
exceptions, and contribution gates are documented in [docs/design-system.md](docs/design-system.md).
The site retains its dark technical identity and works without JavaScript. Motion
can be paused in the header; system reduced-motion preferences take precedence.

## Checks

```powershell
npm ci
npx playwright install chromium
npm run check
npm test
```

The browser suite checks every route for responsive overflow, local links, image
loading, keyboard semantics, enlarged text, and axe accessibility violations. It
also checks motion, the project/contact journey, forced colors, and resume print
geometry. Run selected pages with `npm test -- projects/fabric-ux.html contact.html`.
Screenshots, scan details, and a sample resume PDF are written to ignored
`dist/ui-checks/`. These are review artifacts, not approved visual-diff baselines.
Actual browser zoom, screen-reader testing, and real-device checks remain manual
release gates. There is no build step or configured formatter/linter/type checker.

## Local preview

Open `index.html` directly in a browser, or run a simple static server from this folder.

```powershell
npx serve .
```

## PDF export

Export any local HTML page or URL to PDF with Playwright.

```powershell
npm run export:pdf -- index.html dist/index.pdf
npm run export:pdf -- contact.html dist/contact.pdf
npm run export:pdf -- https://brianbrady.dev dist/site.pdf
```

Shortcut scripts are also available:

```powershell
npm run export:pdf:index
npm run export:pdf:contact
```

## Deploy

This project is ready for GitHub Pages. Publish the repository, then set Pages to deploy from the `main` branch root.