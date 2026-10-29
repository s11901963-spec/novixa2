// End-to-end smoke test in a real browser (Playwright + Chromium).
// Usage: npm run build && npm run test:e2e   (or E2E_URL=http://localhost:5173/ node scripts/e2e-smoke.mjs)
// Checks that the molecule drawn by three.js is the one selected, with the measured
// angles from the data file, and exercises the main interactive flows.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Install it with: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}e2e-artifacts`;
mkdirSync(out, { recursive: true });
const molecules = JSON.parse(readFileSync(`${root}src/data/molecules.json`, 'utf8')).molecules;

let server;
let base = process.env.E2E_URL;
if (!base) {
  const viteBin = `${root}node_modules/vite/bin/vite.js`;
  server = spawn(process.execPath, [viteBin, 'preview', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'pipe' });
  base = 'http://localhost:4173/';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview server did not start')), 20000);
    server.stdout.on('data', (d) => d.toString().includes('4173') && (clearTimeout(timer), resolve()));
  });
}

const failures = [];
const check = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    console.log(`  ✗ ${msg}`);
    failures.push(msg);
  }
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

async function rendered() {
  // Wait until the probe has measured the molecule that is selected now, at rest.
  await page.waitForFunction(
    () => {
      const d = document.querySelector('[data-testid=molecule-viewer]')?.dataset;
      return !!d && d.renderedFor === d.sceneKey && d.settled === 'true';
    },
    null,
    { timeout: 20000 },
  );
  return page.$eval('[data-testid=molecule-viewer]', (el) => ({ ...el.dataset }));
}

try {
  console.log('1. Every lesson molecule: rendered atoms, lone pairs and angles match the data file');
  await page.goto(`${base}#lab`, { waitUntil: 'networkidle' });
  for (const m of molecules.filter((x) => x.category === 'core')) {
    await page.click(`[data-testid=chip-${m.id}]`);
    await page.waitForTimeout(300);
    const d = await rendered();
    const expectedElements = [m.central, ...m.ligands].join(',');
    check(d.renderedElements === expectedElements, `${m.formula}: atoms ${d.renderedElements}`);
    const lp = /E(\d)?$/.exec(m.reference.axe);
    const expectedLp = m.reference.axe.includes('E') ? Number(lp?.[1] ?? 1) : 0;
    check(Number(d.renderedCentralLonePairs) === expectedLp, `${m.formula}: ${d.renderedCentralLonePairs} lone pair(s) on the central atom`);
    const angles = d.renderedAngles.split(',').map(Number);
    for (const a of m.experimental.angles) {
      check(angles.some((x) => Math.abs(x - a.value) <= 0.11), `${m.formula}: ${a.label} = ${a.value}° is drawn (${[...new Set(angles)].join('/')})`);
    }
  }
  await page.screenshot({ path: `${out}/lab-sf6.png` });

  console.log('2. View modes');
  await page.click('[data-testid=chip-sf4]');
  await rendered();
  await page.getByRole('radio', { name: /VSEPR/ }).click();
  await page.waitForTimeout(800);
  check((await page.$eval('[data-testid=molecule-viewer]', (el) => el.dataset.mode)) === 'vsepr', 'VSEPR view active');
  await page.screenshot({ path: `${out}/vsepr-sf4.png` });
  await page.getByRole('radio', { name: /لويس|Lewis/ }).click();
  check(await page.isVisible('[data-testid=lewis-diagram]'), 'Lewis structure drawn');
  await page.screenshot({ path: `${out}/lewis-sf4.png` });
  await page.getByRole('radio', { name: /3D/ }).click();

  console.log('3. Clicking an atom shows its details');
  await page.click('[data-testid=chip-nh3]');
  await rendered();
  const box = await page.$eval('[data-label-key="atom-0"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  await page.waitForSelector('[data-testid=atom-info]', { timeout: 5000 });
  check((await page.$eval('[data-testid=atom-info]', (el) => el.dataset.element)) === 'N', 'clicking the central atom opens nitrogen details');
  await page.click('[data-testid=tab-solution]');

  console.log('4. Solve-it-yourself mode: instant feedback and hidden shape');
  await page.getByRole('radio', { name: /حل بنفسك|Solve it yourself/ }).click();
  await page.waitForTimeout(500);
  check((await page.$eval('[data-testid=molecule-viewer]', (el) => el.dataset.mystery)) === 'true', 'shape hidden before answering');
  await page.fill('#practice-valence', '5');
  await page.click('[data-testid=check-valence]');
  check(await page.getByText('❌').first().isVisible(), 'wrong valence count → ❌ with explanation');
  await page.fill('#practice-valence', '8');
  await page.click('[data-testid=check-valence]');
  check(await page.getByText('✅').first().isVisible(), 'correct valence count → ✅');
  for (const id of ['bonding', 'central-lp', 'steric-number', 'electron-geometry']) await page.click(`[data-testid=reveal-${id}]`);
  await page.click('[data-testid=practice-step-molecular-geometry] [role=radio] >> nth=0');
  await page.click('[data-testid=check-molecular-geometry]');
  const shapeFeedback = await page.locator('[data-testid=practice-step-molecular-geometry] [role=status]').innerText();
  // "linear" for NH3: the diagnosis must name the 4 electron domains the student missed.
  check(shapeFeedback.includes('❌') && shapeFeedback.includes('4'), `wrong shape (linear) → specific diagnosis: "${shapeFeedback.replace(/\s+/g, ' ').slice(0, 120)}"`);
  await page.click('[data-testid=reveal-molecular-geometry]');
  await page.waitForTimeout(1500);
  check((await page.$eval('[data-testid=molecule-viewer]', (el) => el.dataset.mystery)) === 'false', 'shape revealed after the shape step');
  await page.screenshot({ path: `${out}/solve-nh3.png` });
  await page.getByRole('radio', { name: /عرض الحل|Show solution/ }).click();

  console.log('5. Builder recomputes the model');
  await page.click('[data-testid=open-builder]');
  await page.getByRole('button', { name: /ابدأ من الجزيء الحالي|Start from the current molecule/ }).click();
  await page.click('[data-testid=builder] button[title="هيدروجين"], [data-testid=builder] button[title="Hydrogen"]');
  await page.click('[data-testid=builder] button[aria-label="+"]');
  const nh4 = await rendered();
  check(nh4.renderedElements === 'N,H,H,H,H' && nh4.renderedAngles.split(',').every((x) => x === '109.5'), 'NH₃ + H⁺ → tetrahedral NH₄⁺ (109.5°)');

  console.log('6. Challenge level 1');
  await page.goto(`${base}#challenges`, { waitUntil: 'networkidle' });
  await page.click('[data-testid=start-level-1]');
  await page.waitForSelector('[data-testid=question-prompt]');
  const hasNumber = await page.$('[data-testid=answer-number]');
  if (hasNumber) await page.fill('[data-testid=answer-number]', '999');
  else await page.click('[role=radiogroup] button >> nth=0');
  await page.click('[data-testid=submit-answer]');
  check(await page.locator('[role=status]').first().isVisible(), 'answer gets instant feedback');
  await page.screenshot({ path: `${out}/challenge.png` });

  console.log('7. Language switch');
  await page.goto(`${base}#lab`, { waitUntil: 'networkidle' });
  await page.click('[data-testid=lang-toggle]');
  check((await page.evaluate(() => document.documentElement.dir)) === 'ltr', 'English switches the page to left-to-right');
  await page.click('[data-testid=lang-toggle]');
  check((await page.evaluate(() => document.documentElement.dir)) === 'rtl', 'Arabic switches back to right-to-left');

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  failures.push(String(e));
  console.error(e);
} finally {
  await browser.close();
  server?.kill();
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll end-to-end checks passed');
process.exit(failures.length ? 1 : 0);
