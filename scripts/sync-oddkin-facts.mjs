// Keeps the Oddkin case study in step with what Oddkin publishes. Every element marked
// data-oddkin="<fact>" in the pages below is rewritten from npm, the published Custom Elements
// Manifests, and the public repository; data-oddkin-format picks words, "500+", or a date.
//
// Usage: node scripts/sync-oddkin-facts.mjs [--check]
// --check only reports drift and exits 1. GITHUB_TOKEN, when set, raises the GitHub API rate limit.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const pages = ['index.html', 'projects.html', 'projects/oddkin.html'];
const repo = 'brianchristopherbrady/oddkin';
const tooling = ['@oddkin/analyzer', '@oddkin/workbench'];
const check = process.argv.includes('--check');

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'brianbrady.dev-oddkin-sync',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function get(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}
const getJson = async (url, headers) => (await get(url, headers)).json();
const getText = async (url) => (await get(url)).text();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Reads one file from a ZIP archive (stored or deflated entries; no ZIP64). */
function unzip(buffer, name) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  assert(end >= 0, 'release evidence is not a ZIP archive');
  let offset = buffer.readUInt32LE(end + 16);
  for (let index = buffer.readUInt16LE(end + 10); index > 0; index -= 1) {
    const nameLength = buffer.readUInt16LE(offset + 28);
    const entry = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (entry === name) {
      const local = buffer.readUInt32LE(offset + 42);
      const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(start, start + buffer.readUInt32LE(offset + 20));
      return buffer.readUInt16LE(offset + 10) === 8 ? inflateRawSync(data) : data;
    }
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  throw new Error(`${name} is not in the release evidence archive`);
}

async function collect() {
  const names = Object.keys(await getJson('https://registry.npmjs.org/-/org/oddkin/package')).sort();
  assert(names.length > 0, 'npm lists no @oddkin packages');
  const documents = await Promise.all(names.map((name) => getJson(`https://registry.npmjs.org/${name.replace('/', '%2f')}`)));

  const version = documents[0]['dist-tags'].latest;
  const manifests = new Map();
  for (const [index, document] of documents.entries()) {
    const manifest = document.versions[document['dist-tags'].latest];
    assert(manifest.version === version, `${names[index]} is at ${manifest.version}, not ${version}: the page says they ship together`);
    assert(manifest.license === 'MIT', `${names[index]} is licensed ${manifest.license}, not MIT`);
    manifests.set(names[index], manifest);
  }

  const needs = {};
  for (const [name, manifest] of manifests) {
    const required = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }).sort();
    const thirdParty = required.filter((dependency) => !dependency.startsWith('@oddkin/'));
    if (!tooling.includes(name)) assert(thirdParty.length === 0, `${name} now depends on ${thirdParty.join(', ')}: the page says browser packages have none`);
    const listed = required.map((dependency) => (dependency === 'typescript' ? 'the TypeScript compiler' : dependency.replace('@oddkin/', '')));
    needs[`needs.${name.replace('@oddkin/', '')}`] = listed.length ? listed : 'nothing';
  }

  const elements = async (name) => {
    const cem = await getJson(`https://cdn.jsdelivr.net/npm/${name}@${version}/custom-elements.json`);
    const declarations = cem.modules.flatMap((module) => module.declarations ?? []).filter((declaration) => declaration.tagName && !declaration.deprecated);
    return [...new Set(declarations.map((declaration) => declaration.tagName))].sort();
  };
  const [components, ai] = await Promise.all([elements('@oddkin/components'), elements('@oddkin/ai')]);
  assert(components.length > 0 && ai.length > 0, 'a published manifest lists no elements');

  const tree = await getJson(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, githubHeaders);
  assert(!tree.truncated, 'the repository tree was truncated');
  const paths = tree.tree.map((entry) => entry.path);
  const adrs = paths.filter((path) => /^docs\/architecture\/decisions\/\d{4}-.+\.md$/.test(path) && !path.includes('/0000-')).length;
  const icons = paths.filter((path) => /^design\/icons\/(general|gis|healthcare)\/[^/]+\.svg$/.test(path)).length;

  const commitsLink = (await get(`https://api.github.com/repos/${repo}/commits?per_page=1`, githubHeaders)).headers.get('link') ?? '';
  const commits = Number(commitsLink.match(/[?&]page=(\d+)>; rel="last"/)?.[1]);
  assert(commits > 0, 'could not count the commits on main');

  const sizes = await getText(`https://raw.githubusercontent.com/${repo}/main/research/benchmarks/size/measure.mjs`);
  const counterBytes = Number(sizes.match(/^\s*counter:\s*(\d+)/m)?.[1]);
  assert(counterBytes > 0, 'the minimal counter size budget was not found');

  const releases = await getJson(`https://api.github.com/repos/${repo}/releases?per_page=20`, githubHeaders);
  const release = releases.find((candidate) => !candidate.draft && candidate.assets.some((asset) => /^release-evidence.*\.zip$/.test(asset.name)));
  assert(release, 'no GitHub Release carries release evidence');
  const archive = release.assets.find((asset) => /^release-evidence.*\.zip$/.test(asset.name));
  const evidence = JSON.parse(unzip(Buffer.from(await (await get(archive.browser_download_url)).arrayBuffer()), 'evidence.json'));
  const runs = Object.fromEntries(evidence.checks.tests.map((run) => [run.run, run]));
  const e2e = Object.fromEntries(evidence.checks.e2e.projects.map((project) => [project.project, project]));
  for (const run of [...evidence.checks.tests, ...evidence.checks.e2e.projects]) assert(run.failed === 0, `the ${release.tag_name} evidence records failures: the page says none failed`);

  return {
    version,
    releaseDate: documents[0].time[version],
    packages: names.length,
    browserPackages: names.length - tooling.length,
    components: components.length,
    aiElements: ai.length,
    elements: components.length + ai.length,
    aiElementNames: ai.map((tag) => tag.replace(/^odd-/, '').split('-').map((word) => (word === 'ai' ? 'AI' : word)).join(' ')),
    adrs,
    icons,
    commits,
    counterBudget: `${Math.round((counterBytes / 1024) * 10) / 10} KiB`,
    ...needs,
    evidenceVersion: release.tag_name.replace(/^v/, ''),
    testsPassed: evidence.checks.tests.reduce((sum, run) => sum + run.passed, 0) + evidence.checks.e2e.passed,
    testsNode: runs.node.passed,
    testsChromium: runs.chromium.passed,
    testsFirefox: runs.firefox.passed,
    testsWebkit: runs.webkit.passed,
    e2eChromium: e2e.chromium.passed,
    e2eFirefox: e2e.firefox.passed,
    e2eWebkit: e2e.webkit.passed,
  };
}

const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(number) {
  if (number < 20) return small[number];
  if (number < 100) return tens[Math.floor(number / 10)] + (number % 10 ? `-${small[number % 10]}` : '');
  if (number < 1000) return `${small[Math.floor(number / 100)]} hundred${number % 100 ? ` ${words(number % 100)}` : ''}`;
  return number.toLocaleString('en-US');
}

const sentence = (items) => (items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`);

function render(value, format) {
  if (Array.isArray(value)) return sentence(value);
  if (format === 'date') return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'America/Los_Angeles' }).format(new Date(value));
  if (typeof value !== 'number') return value;
  if (format === 'words') return words(value);
  if (format === 'Words') return words(value).replace(/^./, (letter) => letter.toUpperCase());
  if (format === 'hundreds') return `${Math.floor(value / 100) * 100}+`;
  return value.toLocaleString('en-US');
}

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const facts = await collect();
const used = new Set();
const problems = [];
const changes = [];
const updates = [];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const next = html.replace(/<(\w+)([^>]*\sdata-oddkin="([\w.-]+)"[^>]*)>([^<]*)<\/\1>/g, (whole, tag, attributes, fact, text) => {
    used.add(fact);
    if (!(fact in facts)) {
      problems.push(`${page}: unknown fact "${fact}"`);
      return whole;
    }
    const value = render(facts[fact], attributes.match(/\sdata-oddkin-format="([\w-]+)"/)?.[1]);
    if (decode(text) === value) return whole;
    changes.push(`${page}: ${fact} "${decode(text)}" -> "${value}"`);
    return `<${tag}${attributes}>${escape(value)}</${tag}>`;
  });
  if (next !== html) updates.push([page, next]);
}

const cards = [...readFileSync('projects/oddkin.html', 'utf8').matchAll(/<h3>(@oddkin\/[\w-]+)<\/h3>/g)].map((match) => match[1]).sort();
const published = Object.keys(facts).filter((fact) => fact.startsWith('needs.')).map((fact) => fact.replace('needs.', '@oddkin/')).sort();
if (cards.join() !== published.join()) problems.push(`the package map shows ${cards.join(', ')} but npm publishes ${published.join(', ')}: edit the package map`);
for (const fact of Object.keys(facts)) if (!used.has(fact)) problems.push(`fact "${fact}" is not marked on any page`);

if (problems.length) {
  console.error(`Oddkin facts need attention:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
if (!changes.length) {
  console.log(`Oddkin ${facts.version}: every marked fact is current.`);
} else if (check) {
  console.error(`Oddkin ${facts.version}: ${changes.length} facts are out of date:\n${changes.map((change) => `  - ${change}`).join('\n')}`);
  process.exit(1);
} else {
  for (const [page, html] of updates) writeFileSync(page, html);
  console.log(`Oddkin ${facts.version}: updated ${changes.length} facts:\n${changes.map((change) => `  - ${change}`).join('\n')}`);
}
