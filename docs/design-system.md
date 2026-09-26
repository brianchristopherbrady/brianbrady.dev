# Portfolio Design System

## Audit and Migration Plan

This is a static HTML/CSS/JavaScript portfolio for hiring teams, engineering peers,
and potential collaborators. Core journeys are Home -> Projects -> case study,
contact by email, external project links, and reading/exporting the resume.
Preserve every route, project narrative, integration, illustration, and PDF export.

The visual identity is dark, technical, typographic, and rule-based. The current
editorial refinement uses graphite, warm-white text, mint actions, and amber focus;
product illustrations retain their own accent palettes. Keep the native static stack;
no framework, theme switcher, component runtime, or token build pipeline is needed.
Assume current evergreen browsers, English content, normal density, and a WCAG
2.2 AA engineering target. RTL resilience is useful, but translation is not in scope.

Initial evidence: one shared stylesheet, one shared script, repeated HTML shells,
no repository-specific instructions, no functional test suite, and only JS syntax
checks. Shared CSS mixes tokens and literal values, suppresses some focus outlines,
uses small targets and fixed sticky offsets, and clips horizontal body overflow.
The canvas runs continuously without a motion preference or pause control.
The contact address is text instead of an email link. These are implementation
risks, not a claim of a complete accessibility audit.

1. Establish foundation and semantic tokens in styles.css; retain existing aliases.
2. Migrate shared shell, focus, actions, and intrinsic layout in styles.css and HTML.
3. Add explicit motion control and preference handling in script.js; preserve age
   updates, active section tracking, marquee behavior, and animated artwork.
4. Validate Projects -> Fabric UX -> Contact end-to-end before expanding across
   the remaining case studies and resume. Keep embedded product artwork isolated.
5. Document component contracts and exceptions here; add repeatable browser checks.

Acceptance: all 16 routes load; existing destinations remain available; no page
overflow at 320, 375, 768, 1024, 1280, or 1536 CSS pixels; visible keyboard focus
and skip navigation; meaningful current-page state; 44px primary control targets;
readable token contrast; motion pause and reduced-motion support; resilience to
expanded text, reduced height, and forced colors. Inspect rendered screenshots in
addition to DOM checks. Test real browser zoom separately where tooling permits.

Verification results, remaining limitations, and migration exceptions are recorded
below as work proceeds. No independent audit or full WCAG conformance is claimed.

## Source of Truth and Tokens

The `:root` block in ../styles.css is the runtime source of truth. No JSON token
compiler or generated duplicate is needed for this single static site.

| Layer | Examples | Contract |
| --- | --- | --- |
| Foundations | --neutral-950, --text-sm, --space-4, --font-body | Reusable palette, rem-based type/space, font families |
| Semantics | --color-canvas, --color-text-muted, --color-focus | Consume by purpose, never by a page-specific color name |
| Layout and controls | --content-max, --page-gutter, --target-min, --header-height | 76.25rem page measure, intrinsic gutters, 2.75rem targets; header height observed at runtime |
| Motion and layers | --duration-fast, --ease-standard, --layer-header, --layer-skip | Shared transition and stacking roles |
| Existing aliases | --bg, --panel, --line, --text, --muted, --dim, --purple, --max | Supported in existing illustrations; prefer semantic names for new shared UI |

The existing dark theme is intentional; light mode and density switching are not
product requirements. More-contrast strengthens rules and muted text. Forced colors
uses system colors and removes decorative layers. A future theme must override
semantic roles, not individual pages. Do not introduce a switch before defining and
testing all semantic roles for it. Illustration accents retain the existing cyan,
green, amber, blue, and red values; they are not implicit success/error statuses.

Typography uses rem sizes rather than viewport-scaled fonts. Palatino-family
display headings pair with a Trebuchet/Aptos body stack and monospace metadata.
No fonts are fetched over the network. Decorative rules are not control boundaries;
focus uses a distinct 2px amber outline. Route-level axe scans cover text contrast;
incomplete composited-background findings still need human interpretation.

## Component Inventory and Contracts

These are native HTML/CSS patterns, not custom elements or a second component
framework. Stable means covered by this site's browser checks, not certified for
arbitrary consumers.

| Pattern | API and state | Responsive/accessibility contract | Maturity |
| --- | --- | --- | --- |
| Shell | .site-header, .brand, .nav-links | Wrapping flex; native links; one aria-current; no menu or focus trap | Stable |
| Skip link | .skip-link -> main[id][tabindex=-1] | First focusable element; appears on focus; works without JS | Stable |
| Action link | a.button, optional .primary; a.case-link | Navigation only; 44px min height; wraps; visible hover/focus | Stable |
| Motion setting | label.motion-toggle > input#pause-motion[type=checkbox] | Native Space interaction; checked means paused; disabled for OS reduced motion | Stable |
| Project entry | a.project-index-card; article.case-study + a.case-link | One real destination; no nested interactive elements; intrinsic grid | Stable |
| Product preview | a.preview-project > img + .preview-caption | One destination; uncropped 2:1 image allocation; auto-fit 27rem tracks; visible focus | Stable |
| Content band | .section, .section-heading, .detail-panel | Unframed rule-based sections; natural text height; logical source order | Stable |
| Architecture diagram | .diagram-board > .diagram-flow > .diagram-node | Named container; one column below 36rem; textual explanation retained | Stable |
| Migration flow | .migration-flow > .migration-node / .migration-center | Auto-fit 18rem tracks; no absolute text positioning or DOM reorder | Stable |
| Tags | ul.tag-list > li | Noninteractive metadata, not buttons | Stable |
| Product artwork | .shot-canvas, terminal and chart recreations | Illustrations, not live controls; retain original visual language | Local exception |
| Resume | .page in ../resume.html | Screen-only reflow; existing Letter print metrics unchanged | Local exception |

The Art route uses an uncropped, row-ordered gallery with original-file links that
work without JavaScript. Its page-local art.css and art.js reuse the shared tokens.
A native modal dialog adds previous/next navigation, arrow keys, Escape/backdrop
dismissal, focus containment, and focus restoration to the opening artwork.
The original-file action remains available in the viewer. Titles derive from the
source filenames; keep the static entries in sync when adding pieces. The Art
browser checks compare gallery entries against static/art and exercise the viewer.

Do not add disabled/loading/invalid APIs to navigation links. This static site has
no live form submission or data fetching workflow.
If one is introduced, define its keyboard, feedback, failure, and focus contracts
before styling it. An illustrated dialog is not a real dialog.

### Markup Recipes

```html
<a class="skip-link" href="#main-content">Skip to content</a>
<main id="main-content" tabindex="-1">
   <section class="project-layout">
      <article class="detail-panel">
         <h2>Project context</h2>
         <p>Use real project content and a meaningful heading.</p>
         <a class="case-link" href="./contact.html">Contact</a>
      </article>
   </section>
</main>
```

Home, Projects, and Contact use `aria-current="page"` on the exact route. Case
studies use `aria-current="true"` on Projects to identify the containing section.
Any in-page navigation managed by script.js uses `aria-current="location"`.
Keep link destinations in HTML, not JS. Name links for their destination; do not
use a clickable div or nest a button in a project card.

The motion checkbox is initially hidden in HTML and revealed by JS. Without JS,
CSS defaults to static presentation. With JS, a stored explicit pause or the OS
preference pauses canvas and CSS animation. OS reduced motion cannot be overridden
by the checkbox. The storage key is `portfolio-motion-paused`; blocked storage
gracefully falls back to the current page. Hidden tabs stop scheduling canvas
frames. Practice areas are now a static wrapping list; the marquee and its scroll
listener have been removed. Existing canvas and illustration motion remain pausable.

## Responsive Recipes

- Base content width: min(available width minus two gutters, 76.25rem). Grid and
   flex descendants can shrink; long unbroken content can wrap without body clipping.
- Project index: auto-fit 24rem tracks. Detail layouts: auto-fit 26rem tracks.
   Principles: auto-fit 15rem tracks. These adapt to allocation, not device names.
- Home previews: auto-fit 27rem tracks with uncropped images. The opening keeps
   only Projects, Contact, and Resume actions; profile links remain in Contact.
- Case-study introductions and nested diagram headings use balanced desktop
   columns, stacking at 980px. Do not apply the 190px eyebrow track to a nested
   heading-plus-description group.
- Diagram container threshold: 36rem because side-by-side explanations become
   cramped below that space. Diagram tracks have 12rem or 14rem intrinsic minimums.
- Retained 980px breakpoint: asymmetric showcase and supporting content stack.
- Retained 760px breakpoint: shell becomes nonsticky, preventing obscured content
   in narrow/zoomed layouts; no navigation item is hidden.
- Retained 680px breakpoint: single-column case rows and dense product artwork.
   Heading steps remain rem-based, and controls never shrink below target size.
- Desktop sticky offsets use observed header height rather than assuming 64px.
   Narrow-page focus uses a small scroll margin with no sticky obstruction.
- Code blocks wrap long commands, preserving their source text for selection/copy.
   Resume screen styles reflow independently from its fixed Letter print contract.

Keep DOM order equal to reading/tab order. Use logical properties in new patterns;
physical coordinates inside historical artwork remain an explicit exception.
Do not add fixed text heights, hide useful content, or mask page overflow.

## Migration Map

| Previous pattern | Replacement | Status |
| --- | --- | --- |
| One-off shared colors | Foundation -> semantic -> existing aliases | Shared foundation migrated; artwork literals retained |
| 27-32px navigation / small text actions | Token-sized 44px navigation and action links | All 15 site shells migrated |
| CSS-only active styling | aria-current plus existing active class | All site routes migrated |
| Suppressed focus outlines | Shared focus-visible outline | Removed from action/card rules |
| Fixed 620-820px hero minimums | Natural content height and shared spacing | Removed |
| Body overflow hidden | Shrinkable grids and content wrapping | Removed |
| Absolute circular migration text | Intrinsic source-order grid | Removed; enlargement regression added |
| Dead screenshot close button | Decorative span | Corrected, no working action removed |
| Noninteractive contact address | mailto link | Contact migrated |
| Fixed-width resume on screen | Screen-only responsive rules | Print rules preserved |

The alias names remain a documented compatibility surface for existing artwork,
not a temporary adapter without an owner. For new shared styles use semantic roles.
Retire an alias only after searching every HTML and CSS consumer and migrating
them together. Existing unused illustration selectors are not deleted speculatively.

## Contribution and Release Gates

1. Propose the actual product need and identify the owning pattern. Reuse an
    existing token or class before adding a new one; avoid page-specific overrides.
2. For a shared change, update the contract and representative examples here.
    Add a narrow browser check for the behavior, including long content and focus.
3. Run `npm run check`, the narrow `npm test -- <route>` check, then `npm test`.
    The suite writes screenshots, JSON axe findings/incomplete results, and PDF
    evidence under ignored dist/ui-checks. Review screenshots; a pass is not a
    substitute for visual inspection or assistive-technology testing.
4. Manually inspect keyboard order, focus visibility, real browser 200%/400% zoom,
    a real mobile browser, and a screen reader before claiming those checks pass.
5. Review CSS/JS bytes and dependencies. New runtime frameworks, fonts, icon
    loaders, token generators, and measurement loops require a concrete benefit.
6. Commit through normal review and deploy the static root via GitHub Pages.
    This task does not change publishing settings or automatically deploy.

The source repository is the distribution channel; there are no multiple packages
to version independently. For breaking class/token changes, provide an old/new
mapping and migrate all local consumers in the same reviewed change. Remove any
temporary adapter before closing that migration; preserve the resume print contract.

## Verification Scope and Limitations

Automated coverage: all 16 HTML routes; nine widths (320, 375, 600, 768, 1024,
1280, 1440, 1536, 1728); 812x375 landscape; local link/image checks; axe WCAG A/AA tags at
375 and 1280; skip/focus/current states; 200% root text and long headings;
expanded text spacing; enlarged diagram collision detection; motion and storage;
canvas frame/pixel checks; forced-colors/RTL on Home; no-JS navigation; resume
print dimensions and PDF generation. The journey is Home -> Projects -> Fabric UX
-> Contact. All runtime checks use Chromium, not a browser support certification.

The first full run exposed inaccessible horizontal command regions; wrapping
resolved them. A separate geometry probe exposed three DevKit diagram overlaps
with enlarged text; intrinsic layout resolved them and the suite now guards it.
The repo syntax gate and VS Code diagnostics pass. No formatter, linter, TypeScript
compiler, build pipeline, or unit framework was present; none is invented here.

Actual browser zoom is NOT simulated by changing root font size or viewport width.
200%/400% browser zoom, NVDA/VoiceOver, actual touch devices, Safari/Firefox, and
network/offline external destinations are not verified in this environment. Axe
incomplete findings require human review; image/illustration meaning and screen
reader reading experience are not certified by automated results. Screenshots are
inspection artifacts, not approved pixel-diff regression baselines.

No client dependency or network font was added. @axe-core/playwright is dev-only;
Playwright was already a dev dependency. package-lock.json makes installations
repeatable. Native Grid/container queries and ResizeObserver require current
evergreen browsers. Follow-up priority: real zoom and assistive technology, then
cross-browser/device coverage, then optional approved visual regression baselines.

### Foundation Run: 2026-09-20 (Before Editorial Refinement)

- Windows; Playwright Chromium 153.0.8010.12; local file URLs, no dev server needed.
- Final `npm test`: 244 checks passed, zero failed, all 16 routes. All 32 axe scans
   report zero violations. Labelled generic containers now have group roles; the
   suite also rejects incomplete aria-prohibited-attr findings.
- `npm run check`, VS Code diagnostics, and patch whitespace checks pass.
- Desktop Home and mobile Contact screenshots reviewed; forced-colors/RTL
   screenshot reviewed and repaired after it exposed unreadable primary labels.
   Primary links now explicitly use system ButtonFace/ButtonText colors without
   automatic backplate substitution. Portrait loading is awaited in that capture.
- Muted semantic text contrast: 8.16:1 or better on all four shared dark surfaces.
   Axe cannot resolve every composited/pseudo-element background; those incomplete
   contrast results remain in the JSON report for manual review, not a claimed pass.
- Runtime transfer growth is approximately 1.4KB combined gzip for CSS and JS;
   no runtime package or font requests were added. This is a size comparison, not
   a Lighthouse, Core Web Vitals, or real-device performance benchmark.
- Local navigation, email href, assets, motion preferences, keyboard focus,
   representative workflow, reflow, and PDF generation are verified. Real browser
   zoom, assistive technology, and cross-browser/device gates remain outstanding.

## Editorial Refinement: 2026-09-20

### Product and Direction

This portfolio helps hiring teams and engineering peers evaluate Brian's systems
work, inspect case studies, read his resume, and make contact. Brand idea: design
judgment backed by production evidence. Attributes: precise, human, rigorous,
practical. Keep the dark technical identity but replace purple atmosphere and
uniform heavy type with graphite surfaces, mint accents, serif display type,
clear text links, and the existing product screenshots. No light mode is added:
the site had no theme switcher or light-theme contract. The light resume remains
an independent print-oriented document.

Initial visual problems were a claim-led opening with no immediate personal
identity or work imagery, animated practice text competing with navigation,
oversized contact whitespace, and dense case-study headings inheriting narrow
eyebrow grid tracks. Shared styles were the controlling source of these problems.

### Implementation and Iteration

- Home now identifies Brian and his Microsoft UX role immediately, then shows
   Output Conductor and Astra Synastry using existing uncropped screenshots.
   A Fabric UX link connects the previews to the 160+ component platform work.
- Existing principles and practice-area content remain below the previews.
   The ticker becomes a readable static list; obsolete hero/marquee CSS and
   scroll work are removed. Canvas motion preferences and persistence remain.
- Projects uses a concise title and consistent text-led catalogue. An intermediate
   thumbnail treatment was removed after screenshots revealed uneven row gaps.
- Contact uses natural content height; Home's former email-shaped span is a
   working mailto link. Resume is now reachable from Home and Contact.
- Shared header alignment, 44px controls, amber keyboard focus, action hierarchy,
   case-study intro columns, and diagram heading allocation are consistent.
   Mobile navigation stays visible in DOM order, without a hidden menu.
- A 320px test caught a three-row header; reduced horizontal link padding restored
   a compact two-row header without reducing target height. Forced-colors review
   also exposed and corrected secondary-link border specificity.
- No routes, case-study narratives, external destinations, PDF geometry, or
   dependencies were removed or replaced. Existing user edits were preserved.

### Browser Evidence

Rendered review used local file URLs and standalone Playwright Chromium on Windows,
with CSS viewport dimensions rather than physical devices or browser zoom.
Representative viewport captures are generated by `npm test` in `dist/ui-checks`:

| Evidence | Artifact |
| --- | --- |
| Home narrow / mobile | viewport-index.html-320.png, viewport-index.html-375.png |
| Home tablet / desktop / wide | viewport-index.html-768.png, viewport-index.html-1440.png, viewport-index.html-1728.png |
| Catalogue tablet | viewport-projects.html-768.png |
| Contact mobile / wide | viewport-contact.html-375.png, viewport-contact.html-1440.png |
| Fabric UX laptop / desktop | viewport-projects-fabric-ux.html-1024.png, viewport-projects-fabric-ux.html-1440.png |
| Corrected DevKit diagram | final-devkit-diagram.png |
| Catalogue detail | final-project-catalogue.png |
| Preview keyboard focus | detail-keyboard-preview.png |

The shared VS Code browser was inspected first, but its `before-*` screenshot
files have distorted viewport scaling and are not valid pixel-comparison baselines.
Standalone Chromium captures are the reliable rendered evidence. Inspection
included responsive layout, loaded images, below-fold detail, focus, reduced
motion and forced colors. The original product artwork is not a live form.

### Results and Limits

Final full suite: **293 checks passed, zero failed**, across all 16 routes.
All 32 axe scans have zero violations; incomplete findings remain in results.json.
`npm run check` and editor diagnostics pass. Preview keyboard Enter navigation
was separately verified with an explicit wait for the Output Conductor URL.
Representative console checks reported no errors; the full suite traps page errors.
New regression checks cover mobile header height, first-viewport work visibility,
uncropped loaded previews, resume navigation, and diagram heading allocation.
Existing text enlargement, text spacing, landscape, motion/storage, forced-colors,
no-JS, local asset/destination, resume print geometry and PDF checks still pass.

There is no build, typecheck, formatter, or unit-test command in this static stack.
No runtime library or network font was added. Reusing two local screenshots on Home
does add image transfer; no Core Web Vitals, network throttling, or physical-device
performance benchmark was performed. Native image aspect ratios reserve space.
Actual 200%/400% browser zoom, screen-reader testing, physical touch devices,
Safari/Firefox, external destination availability, and full WCAG conformance remain
unverified. Next release gate: real zoom and assistive-technology review, then
cross-browser/device testing. No independent accessibility audit is claimed.

## Project Artwork and Journal Expansion: 2026-09-20

The requested project artwork now replaces the original two-image opening on both
Home and Projects. Both use the same five destinations and assets:

| Project | Asset | Provenance |
| --- | --- | --- |
| Output Conductor | static/output-conductor-pipeline.png | Existing pipeline screenshot, native 1919:424 ratio in a full-width row |
| Glyph | static/glyph-backtest-lab.svg | Existing vector backtest illustration, reused without rasterization |
| Signal Terminal | static/signal-terminal-preview.png | Element capture of the existing .signal-terminal-window HTML/CSS illustration |
| HandForge | static/handforge-preview.png | Element capture of the existing .handforge-board HTML/CSS illustration |
| Astra Synastry | static/astra-synastry-transits.png | Existing transit-chart image, without portfolio navigation overlays |

The remaining preview frames use 16:10 allocation and object-fit: contain, never
cover. The first panoramic row avoids reducing the very wide pipeline to a small
strip inside a tall frame. All previews are ordinary case-study links with named
images and keyboard focus. No screenshots were fabricated from unrelated apps.
The two HTML/CSS captures are illustrations, not live product screenshots; their
alt text retains that distinction. Regenerate them with `npm run capture:previews`.
The script uses reduced motion, removes sticky header/decorative interference in
the capture context only, and writes only the two generated assets.

### New Project Content

Four new profiles are reachable from Home and the Projects catalogue. Source
repositories were inspected read-only; no environment files, credentials, or
personal runtime data were accessed. There are no invented deployment or GitHub
links. Public repository availability was not assumed from a local folder name.

| Profile | Source inspected under C:/Users/Owner/repos | Scope represented |
| --- | --- | --- |
| blipmap | blipmap/README.md | Local-first observation and routing development project; source and provider limits retained |
| Elsewhere | elsewhere/README.md | Seattle planning prototype; curated data vs live calendar distinguished |
| Glasshouse | glasshouse/package.json; packages/domain/src/evidence.ts and drift.ts; packages/parser/src/index.ts; apps/server/src/routes/telemetry.ts and runs.ts | In-progress schemas and API foundation, not a completed dashboard; apps/web/src had no files |
| Counterpart Assistant / Care Booking | counterpart_assistant/README.md | Fictional browser-only booking demo; actual app name retained, simulated sign-in explicitly identified |

Journal is a static, directly linkable page with four dated repository notes and
stable project anchors. Entries discuss documented engineering decisions, not
invented personal experiences or release history. September 20 is the note date,
not an asserted product launch date. Existing Medium essays remain on Home.
Project pages link to their matching note, and each note links back to its project.
This editorial copy should receive the owner's normal publishing review.

### Verification

The browser suite includes all 21 pages, both galleries' exact five asset sources,
image decoding and containment, entry-page discovery of the four new profiles,
and project-to-journal round trips. Responsive/axe/keyboard/print/motion gates
remain in place. Journal and new profile viewport captures are written to
dist/ui-checks alongside the previous evidence. Run `npm test` for current counts
and results.json; `npm run check` covers both new and existing scripts.

Final verification: 385 checks passed, zero failures, and zero violations across
42 axe scans. Syntax checks, editor diagnostics, and patch whitespace checks pass.

Gallery evidence: requested-home-gallery-loaded.png and
requested-project-gallery-loaded.png; requested-lower-gallery.png separately
confirms the rendered HandForge and Astra images in the viewport. Initial tall
element captures omitted offscreen image paint despite successful decoding; the
final captures scroll each image into view before capturing. The earlier
requested-home-gallery.png and requested-project-gallery.png are not reliable
evidence of the lower rows.
Journal evidence: viewport-journal.html-375.png and journal-glasshouse.png.
Element-only captures temporarily make the sticky header static to exclude page
chrome; ordinary viewport captures retain the actual header behavior.

Source applications were not launched or tested as part of this portfolio update.
Their features are described from repository evidence, not newly verified runtime
claims. No new app screenshots or public demo deployments are implied. The existing
cross-browser, assistive-technology, physical-device, and real-zoom limitations apply.

## Thumbnail Composition Refinement: 2026-09-22

This supersedes the earlier all-contain preview rule. The four supporting project
links retain consistent 16:10 dimensions but now use edge-to-edge cover treatment.
Glyph focuses toward the backtest plot; Astra focuses on the central aspect pattern.
Original, uncropped artwork remains on the case-study pages. Output Conductor
retains its full-width panoramic row and native image ratio.

Signal Terminal and HandForge are re-rendered from their existing HTML/CSS
illustrations into intentional 800x500 compositions rather than letterboxed
ultrawide screenshots. Capture-only layout rules do not alter the project pages.
Whole-pixel capture alignment prevents a fractional origin from adding a pixel
to the output height. Regenerate with `npm run capture:previews`.

Preview frames have quiet transparent borders at rest and retain accent borders
on hover/focus. No fabricated product screens, new dependencies, or generated
replacement art were introduced. Existing newly supplied screenshot files were
left untouched by this refinement.

Validation: 44 focused browser checks passed on Home and Projects, including
image decoding, exact generated image sizes, stable 16:10 geometry, keyboard
journeys, axe scans, and responsive widths. Desktop and mobile evidence reviewed:
dist/ui-checks/refined-thumbnails-desktop.png and refined-thumbnails-mobile.png.
The existing physical-device and assistive-technology limitations still apply.

## Project Screenshot Galleries: 2026-09-23

Elsewhere now includes discovery cards in Field Journal and the Civic Modern dark
day map. Glyph includes its dashboard and separate plan, execution, and current
account views. These six JPEGs are crops of supplied product screenshots, not
generated interfaces. Existing illustrations remain in place.

Each image links to the untouched full-resolution source and has descriptive alt
text, a caption, and intrinsic dimensions. Gallery images retain their natural
proportions. Elsewhere preserves the map attribution and labels photography and
walking estimates appropriately. Glyph captions explicitly identify demo data
and simulated brokerage state; pictured returns are not investment results.

Regenerate with `npm run crop:projects`. The crop script uses source-width-relative
bounds, validates them against decoded dimensions, and exports JPEGs at up to
1600 pixels wide with quality 0.9. Source bytes are embedded for canvas processing
so offline generation does not require relaxed browser file security.

Sources: elsewhere_homescreen_default_theme_fullpage.jpeg,
elsewhere_daymap_theme_civic_darkmode.jpeg, glyph_homescreen_fullpage.jpeg,
and glyph_machinestate_fullpage.jpeg, all under static/.

Validation: 48 focused browser checks passed for Elsewhere and Glyph, including
four axe scans with zero violations, responsive widths from 320 to 1728 pixels,
image decoding, exact asset dimensions, source links, and undistorted rendering.
Syntax checks and editor diagnostics pass. Mobile and desktop image captures
are under dist/ui-checks/gallery-*.png. Images were individually scrolled into
view for capture; neighboring images may not yet be painted in earlier captures.
No shared styles were changed. Cross-browser, real zoom, physical-device, and
assistive-technology verification remain outside this focused update.

## Equal Project Listings: 2026-09-23

The owner's preference for equal project presentation supersedes the earlier
featured-gallery and thumbnail rules on Home and Projects. Both entry pages now
list all 16 projects once, in the same order, using the existing numbered text-row
pattern. There is no featured Microsoft cluster, large image gallery, or separate
workbench group. Fabric UX and Fluent UI each have their own ordinary row.

Home retains its existing project descriptions and tags; the newer projects and
Mnemonic Weather Engine now join that list. Projects uses concise descriptions
with the same row structure and heading size. Individual case-study screenshots,
source assets, journal entries, and crop-generation scripts are unchanged.

Validation: 44 focused browser checks pass for Home and Projects, including four
axe scans, responsive reflow, navigation, and exact project coverage. Regression
checks require one entry per project, consistent order and numbering, and no
featured groups. Desktop/mobile evidence is in dist/ui-checks/equal-list-*.png.
Syntax checks and editor diagnostics pass. Previous cross-browser and
assistive-technology verification limits still apply.

## Resume Reference Match: 2026-09-23

The HTML resume now follows the owner's supplied three-page 2026 resume, rather
than the previous compact one-page content. All visible text was compared against
the extracted source text, ignoring whitespace, with an exact match. This includes
GISTIC Research, revised Microsoft dates, all eight roles, education, and skills.
The uploaded PDF remains untouched and is not embedded or linked by the page.

Local Roboto and Roboto Mono variable fonts reproduce the source's type families;
their OFL license files accompany them under static/. Teal headings, gray dividers,
paragraph-based experience entries, and Letter proportions match the reference.
The screen view flows continuously and enlarges type on mobile. Print-only spacing
keeps the complete document at three pages, verified through Chromium export and
rendered-page inspection. Exact line breaks can vary with browser/font versions.

The focused resume suite passes 25 checks, including reflow, axe scans, enlarged
text, font loading, content structure, PDF-free markup, and print geometry.
Reference renders and temporary PDF inspection tooling stay in ignored dist/;
inspection dependencies were installed outside the repository. No production
PDF renderer or new npm dependency was added. Other portfolio biography copy
was not changed as part of this resume-only update.

## Blipmap and Elsewhere Screenshots: 2026-09-24

Six new crops use supplied PNGs: Blipmap route review, observation evidence,
and cluster inspection; Elsewhere identity, filtered discovery, and one itinerary
stop. The newer discovery capture replaces the older discovery image on the
Elsewhere page. Its existing day map remains. Home and Projects keep their
equal-weight text lists without featured imagery.

The gallery-editorial variant limits these case-study galleries to 72rem.
Supporting details use two columns above 760px and stack below that width;
images keep their intrinsic ratios. Captions retain uncertainty notices and
OpenStreetMap attribution. Sources are unchanged. The itinerary crop excludes
personal notes and links to itself rather than the full planner screenshot;
the supplied original still exists in static/ and is not redacted.

Regenerate with npm run crop:projects. The script now handles embedded PNG
and JPEG sources with their respective MIME types, avoids upscaling smaller
crops, and validates crop bounds. The original blipmap.png remains available
but is not displayed because the route-result screenshot conveys more context.

Verification: 48 focused browser checks passed, including four axe scans,
source links, exact image dimensions, aspect ratios, and responsive reflow.
Desktop/mobile gallery captures were visually reviewed under dist/ui-checks/.
Script syntax and editor diagnostics pass. This portfolio image update does
not change or verify the source applications' calendar-saving behavior.

## Project Actions: 2026-09-24

Known repository and deployment links use a project-actions row below each
case-study introduction. The row spans the introduction grid and its buttons
size to their content, preventing grid stretching into oversized panels.
Buttons retain a minimum 44px touch target and wrap at narrow widths.

Repository actions say View repo; GitHub Pages deployments say View demo;
Glyph's supplied custom-domain site says Visit live site. Fluent UI retains
its separate public-PR action beside its repository link. Existing CertPilot,
HandForge, and Our American Gods repository destinations are preserved.
Mnemonic Weather Engine uses the supplied named repository instead of fun.
No destination was guessed for a project without a supplied or existing URL.
External actions open a new tab with noopener and noreferrer.

Validation: 254 checks passed across all twelve updated pages, including
24 axe scans, exact destination and label assertions, responsive reflow,
and compact button geometry at mobile and desktop widths. Representative
action screenshots were reviewed under dist/ui-checks/actions-*.png.
Asset checks now await image decoding instead of racing lazy loading.
Syntax checks and editor diagnostics pass. External service availability
and authentication requirements are not guaranteed by these UI checks.

## Original Visual Theme Restored: 2026-09-24

At the owner's request, the committed near-black/violet visual language replaces
the uncommitted graphite/mint theme. Restored elements include the original color
values, bold sans-serif headings, star brand mark, subtle grid/diagonal texture,
violet background wash, underlined primary actions, homepage orbital field, and
scrolling practice strip. Current homepage wording remains unchanged.

This is a visual-layer restoration, not a file or repository rollback. All 16
equal-weight project entries, new case studies, cropped screenshots, journal
entries, repository/demo links, and the separately styled resume are retained.
Responsive grids, compact project actions, focus treatment, touch targets,
forced-color support, and motion preferences also remain. The decorative strip
duplicates the existing accessible practice list and is hidden from assistive
technology. Both restored animations honor the persistent pause control and
system reduced-motion preference; no JavaScript means paused decoration.

Verification: all 415 checks passed across 21 routes, including 42 axe scans.
Tests now assert the restored accent, four orbital markers, changing animation
transforms, and paused animation states. Desktop/mobile running-state captures
are dist/ui-checks/restored-home-running-1440.png and
dist/ui-checks/restored-home-running-375.png. Representative project screenshots
were also reviewed. Script syntax and editor diagnostics pass. Physical devices,
screen readers, actual browser zoom, and non-Chromium engines remain unverified.