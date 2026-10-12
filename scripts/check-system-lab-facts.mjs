// Checks the Design System Lab case study against the project's source before a release.
// Every element marked data-fact in projects/system-lab.html is compared with the value
// computed from a local checkout of the lab, so counts and inventories cannot drift silently.
//
// Usage: node scripts/check-system-lab-facts.mjs [path to the design-system-lab checkout]
// The path defaults to SYSTEM_LAB_DIR, then ../design-engineering.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const lab = resolve(process.argv[2] ?? process.env.SYSTEM_LAB_DIR ?? '../design-engineering');
const pagePath = 'projects/system-lab.html';

if (!existsSync(join(lab, 'src/design-system/tokens/generated/manifest.ts'))) {
  console.error(`No Design System Lab checkout with generated tokens at ${lab}. Pass its path as the first argument.`);
  process.exit(2);
}

const read = (path) => readFileSync(join(lab, path), 'utf8');
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const list = (text) => text.split(/,\s*(?:and\s+)?|\s+and\s+/).map(normalize).filter(Boolean).sort();
const decode = (text) =>
  text.replace(/&times;/g, '\u00d7').replace(/&mdash;/g, '\u2014').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Tokens: the generated manifest is a JSON array after its type annotation.
const manifest = read('src/design-system/tokens/generated/manifest.ts');
const arrayStart = manifest.indexOf('= [', manifest.indexOf('export const tokenManifest')) + 2;
const records = JSON.parse(manifest.slice(arrayStart, manifest.lastIndexOf(']') + 1));
const tokenPaths = new Set(records.map((record) => record.path));

const namesOf = (name) => JSON.parse(read('src/design-system/tokens/generated/tokens.ts').match(new RegExp(`${name} = (\\[[^\\]]*\\])`))[1]);

const catalog = read('src/domain/system/catalog.ts');
const components = (layer) =>
  [...catalog.matchAll(/name: '([^']+)', kind: 'component', layer: '(\w+)'/g)].filter((match) => match[2] === layer).map((match) => match[1]);

const products = [...read('src/domain/system/products.ts').matchAll(/^\s+name: '([^']+)',/gm)].map((match) => match[1]);
const dependencies = Object.keys(JSON.parse(read('package.json')).dependencies);
const fontPrefix = '@fontsource-variable/';

function contrastChecks() {
  const dir = mkdtempSync(join(tmpdir(), 'system-lab-facts-'));
  const output = join(dir, 'contrast.json');
  try {
    // Run the lab's own Vitest with this Node, so no shell is involved.
    const vitest = join(lab, 'node_modules/vitest/vitest.mjs');
    execFileSync(process.execPath, [vitest, 'run', 'src/design-system/tokens/contrast.test.ts', '--reporter=json', `--outputFile=${output}`], {
      cwd: lab,
      stdio: 'ignore',
    });
    const report = JSON.parse(readFileSync(output, 'utf8'));
    return report.numFailedTests === 0 ? String(report.numPassedTests) : `${report.numFailedTests} failing`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** What each data-fact should say, computed from the lab. Lists compare as sets; tokens must exist. */
const expected = {
  tokens: { value: String(records.length) },
  'css-lines': { value: String(read('src/design-system/tokens/generated/tokens.css').trimEnd().split('\n').length) },
  combinations: { value: [namesOf('productNames'), namesOf('themeNames'), namesOf('densityNames')].map((names) => names.length).join(' \u00d7 ') },
  'contrast-checks': { value: contrastChecks() },
  'decision-records': { value: String(readdirSync(join(lab, 'docs/decisions')).filter((file) => /^\d{4}-.+\.md$/.test(file)).length) },
  products: { list: products },
  'layout-components': { list: components('Layout') },
  'primitive-components': { list: components('Primitive') },
  'composite-components': { list: components('Composite') },
  'runtime-libraries': { list: dependencies.filter((name) => !name.startsWith(fontPrefix)) },
  fonts: { list: dependencies.filter((name) => name.startsWith(fontPrefix)).map((name) => name.slice(fontPrefix.length)) },
};

const html = readFileSync(pagePath, 'utf8');
const stated = [...html.matchAll(/<(\w+)[^>]*\sdata-fact="([\w-]+)"[^>]*>([^<]*)<\/\1>/g)].map((match) => ({ fact: match[2], text: decode(match[3]) }));
const problems = [];

for (const { fact, text } of stated) {
  if (fact === 'token') {
    if (!tokenPaths.has(text)) problems.push(`token ${text} does not exist`);
    continue;
  }
  const want = expected[fact];
  if (!want) problems.push(`unknown fact "${fact}"`);
  else if (want.value !== undefined && text !== want.value) problems.push(`${fact}: page says "${text}", source says "${want.value}"`);
  else if (want.list && list(text).join() !== want.list.map(normalize).sort().join()) {
    problems.push(`${fact}: page lists "${text}", source has "${want.list.join(', ')}"`);
  }
}
for (const fact of Object.keys(expected)) if (!stated.some((entry) => entry.fact === fact)) problems.push(`${fact} is not marked on the page`);

if (problems.length) {
  console.error(`${pagePath} is out of date with ${lab}:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`${pagePath}: ${stated.length} facts match ${lab}.`);
