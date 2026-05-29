# brianbrady.dev

Static portfolio site for Brian Brady.

## What is in here

- `index.html` - the page structure and portfolio content.
- `styles.css` - the visual system, responsive layout, and strange-web treatment.
- `script.js` - animated canvas signal field and marquee behavior.
- `CNAME` - custom domain configuration for GitHub Pages.

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