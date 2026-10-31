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
// Feedback sounds announce themselves with a 'chem3d:cue' event (kind and the words spoken).
await page.addInitScript(() => {
  window.__cues = [];
  window.addEventListener('chem3d:cue', (e) => window.__cues.push(e.detail));
});
const lastCue = () => page.evaluate(() => window.__cues.at(-1) ?? null);
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

const IDEAL = { AX2: [180], AX3: [120], AX4: [109.5], AX5: [90, 120], AX6: [90] };

try {
  console.log('1. Every lesson molecule: rendered atoms, lone pairs and angles match the data file');
  await page.goto(`${base}#lab`, { waitUntil: 'networkidle' });
  check((await page.$eval('[data-testid=tab-practice]', (el) => el.getAttribute('aria-selected'))) === 'true', '"Solve it yourself" is the first, selected activity');
  await page.click('[data-testid=tab-solution]');
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
    // Molecules without measured data (NbBr5) are drawn with the ideal VSEPR angles.
    const expectedAngles = m.experimental ? m.experimental.angles : IDEAL[m.reference.axe].map((value) => ({ label: `ideal ${m.reference.axe}`, value }));
    for (const a of expectedAngles) {
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
  await page.click('[data-testid=tab-practice]');
  await page.waitForTimeout(500);
  check((await page.$eval('[data-testid=molecule-viewer]', (el) => el.dataset.mystery)) === 'true', 'shape hidden before answering');
  await page.fill('#practice-valence', '5');
  await page.click('[data-testid=check-valence]');
  check(await page.getByText('❌').first().isVisible(), 'wrong valence count → ❌ with explanation');
  let heard = await lastCue();
  check(heard?.kind === 'wrong' && heard.text === 'إجابة غير صحيحة، حاول مرة أخرى', `❌ also sounds: low buzz and «${heard?.text}»`);
  await page.fill('#practice-valence', '8');
  await page.click('[data-testid=check-valence]');
  check(await page.getByText('✅').first().isVisible(), 'correct valence count → ✅');
  heard = await lastCue();
  check(heard?.kind === 'correct' && heard.text === 'إجابة صحيحة', `✅ also sounds: chime and «${heard?.text}»`);
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
  await page.click('[data-testid=tab-solution]');

  console.log('5. Change the angle yourself: drag an atom in the model, right/wrong at once, three tries, then the answer');
  await page.click('[data-testid=chip-nh3]');
  await page.click('[data-testid=tab-angle]');
  await page.waitForSelector('[data-testid=angle-panel]', { state: 'visible' });
  check((await page.$eval('[data-testid=angle-try]', (el) => el.dataset.value)) === '120', 'NH₃ starts flat (120°), not at the answer');
  const live = () => page.$eval('[data-testid=angle-live]', (el) => ({ live: el.dataset.live, value: Number(el.dataset.value) }));
  const arcLabel = () => page.$eval('[data-label-key="angle-0"]', (el) => el.className);
  check((await live()).live === 'bad' && (await page.isVisible('[data-testid=angle-drag-hint]')), 'the model shows ❌ for 120° and invites the student to drag an atom');
  const shows = (deg) =>
    page.waitForFunction(
      (a) => {
        const d = document.querySelector('[data-testid=molecule-viewer]')?.dataset;
        return !!d && d.settled === 'true' && d.renderedAngles.split(',').some((x) => Math.abs(Number(x) - a) <= 0.1);
      },
      deg,
      { timeout: 15000 },
    );
  // The model glides to the flat start shape first; grab the atom where it ends up.
  await shows(120);
  await rendered();
  const selectedBefore = await page.$$eval('.atom-label.is-selected', (els) => els.length);
  const h1 = await page.locator('[data-label-key="atom-1"]').boundingBox();
  await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2);
  await page.mouse.down();
  await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2 + 45, { steps: 9 });
  await page.mouse.up();
  const bentTo = Number(await page.$eval('[data-testid=angle-try]', (el) => el.dataset.value));
  check(bentTo < 118 && (await live()).value === bentTo, `dragging an H atom in the 3D model closes the umbrella (120° → ${bentTo}°), the protractor follows`);
  const tryAngle = async (deg) => {
    await page.click(`[data-testid="angle-try-preset-${deg}"]`);
    await shows(deg);
    const d = await rendered();
    await page.click('[data-testid=angle-check]');
    return { d, f: await page.$eval('[data-testid=angle-feedback]', (el) => ({ correct: el.dataset.correct, code: el.dataset.code, text: el.textContent })) };
  };
  await shows(bentTo);
  const bentScene = await rendered();
  check(bentScene.renderedAngles.split(',').every((x) => Math.abs(Number(x) - bentTo) <= 0.1), `the model is drawn at the dragged angle (${bentScene.renderedAngles})`);
  check((await page.$$eval('.atom-label.is-selected', (els) => els.length)) === selectedBefore, 'dragging an atom does not select it');
  await page.click('[data-testid="angle-try-preset-107"]');
  await shows(107);
  check((await live()).live === 'ok' && (await arcLabel()).includes('is-ok'), '107° → the model turns green ✅ at once (badge and angle label)');
  await page.screenshot({ path: `${out}/angle-live-ok.png` });
  await page.click('[data-testid="angle-try-preset-120"]');
  await shows(120);
  check((await live()).live === 'bad' && (await arcLabel()).includes('is-bad'), '120° → red ❌ at once');
  await page.click('[data-testid=angle-live-toggle]');
  check((await live()).live === 'off' && !(await arcLabel()).includes('is-'), 'right/wrong on the model can be switched off (challenge mode)');
  await page.click('[data-testid=angle-live-toggle]');
  let at = await tryAngle(109.5);
  check(at.d.renderedAngles.split(',').every((x) => x === '109.5'), `3D model shows the chosen 109.5° (${at.d.renderedAngles})`);
  check(at.f.correct === 'false' && at.f.code === 'ignored-lp', `109.5° for NH₃ → ❌ lone pair not taken into account: "${at.f.text.slice(0, 80)}"`);
  at = await tryAngle(120);
  check(at.f.code === 'other-geometry', '120° → ❌ that is the angle of three domains');
  const svg = await page.$('[data-testid=angle-try] svg');
  const bb = await svg.boundingBox();
  const k = bb.width / 260;
  await page.mouse.click(bb.x + (130 + 90 * Math.cos((100 * Math.PI) / 180)) * k, bb.y + (128 - 90 * Math.sin((100 * Math.PI) / 180)) * k);
  const dragged = Number(await page.$eval('[data-testid=angle-try]', (el) => el.dataset.value));
  check(Math.abs(dragged - 100) <= 1, `tapping the protractor sets the angle (${dragged}°)`);
  at = await tryAngle(107);
  check(at.f.correct === 'true' && at.d.renderedAngles.split(',').every((x) => x === '107.0'), `107° → ✅ and the model shows it (measured 106.67°)`);
  await page.screenshot({ path: `${out}/angle-nh3.png` });
  await page.click('[data-testid=chip-h2o]');
  await page.waitForTimeout(400);
  for (const deg of [180, 90, 120]) await tryAngle(deg);
  check((await page.$eval('[data-testid=angle-panel]', (el) => el.dataset.revealed)) === 'true', 'H₂O: after three wrong tries the correct angle is shown on the model');
  await shows(104.48);
  const shown = await rendered();
  check(shown.renderedAngles.split(',').every((x) => Math.abs(Number(x) - 104.5) <= 0.1), `the model moves to 104.48° (${shown.renderedAngles})`);

  console.log('6. Info card can be dragged aside and folded');
  const card = await page.$('[data-testid=viewport-summary]');
  const before = await card.boundingBox();
  const handle = await (await page.$('[data-testid=viewport-summary-handle]')).boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 220, handle.y + 200, { steps: 6 });
  await page.mouse.up();
  const after = await card.boundingBox();
  check(Math.abs(after.x - before.x) > 60 && Math.abs(after.y - before.y) > 60, `info card dragged (${Math.round(before.x)},${Math.round(before.y)} → ${Math.round(after.x)},${Math.round(after.y)})`);
  await page.click('[data-testid=viewport-summary-fold]');
  check((await page.$eval('[data-testid=viewport-summary]', (el) => el.dataset.collapsed)) === 'true', 'info card folds to one line');
  await page.click('[data-testid=viewport-summary-fold]');
  await page.click('[data-testid=tab-solution]');

  console.log('7. Builder recomputes the model');
  await page.click('[data-testid=chip-nh3]');
  await page.click('[data-testid=open-builder]');
  await page.getByRole('button', { name: /ابدأ من الجزيء الحالي|Start from the current molecule/ }).click();
  await page.click('[data-testid=builder] button[title="هيدروجين"], [data-testid=builder] button[title="Hydrogen"]');
  await page.click('[data-testid=builder] button[aria-label="+"]');
  const nh4 = await rendered();
  check(nh4.renderedElements === 'N,H,H,H,H' && nh4.renderedAngles.split(',').every((x) => x === '109.5'), 'NH₃ + H⁺ → tetrahedral NH₄⁺ (109.5°)');

  console.log('8. Challenge level 1');
  await page.goto(`${base}#challenges`, { waitUntil: 'networkidle' });
  await page.click('[data-testid=start-level-1]');
  await page.waitForSelector('[data-testid=question-prompt]');
  const hasNumber = await page.$('[data-testid=answer-number]');
  if (hasNumber) await page.fill('[data-testid=answer-number]', '999');
  else await page.click('[role=radiogroup] button >> nth=0');
  await page.click('[data-testid=submit-answer]');
  check(await page.locator('[role=status]').first().isVisible(), 'answer gets instant feedback');
  await page.screenshot({ path: `${out}/challenge.png` });

  console.log('9. Electron configurations: four representations and instant correction');
  await page.goto(`${base}#electrons`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=electrons-page]', { timeout: 10000 });
  check((await page.textContent('[data-testid=credits]')).includes('عوض عواض وسلطان عبدالله العصيمي'), 'credits line shown in the footer');
  await page.getByRole('radio', { name: /استكشف|Explore/ }).click();
  await page.click('[data-testid=pt-Cr]');
  check((await page.$eval('[data-testid=ec-element]', (el) => el.dataset.symbol)) === 'Cr', 'periodic table selects chromium');
  check((await page.textContent('[data-testid=ec-rep-noble]')).includes('[Ar] 4s1 3d5'), 'Cr noble-gas notation is the measured [Ar] 4s¹ 3d⁵');
  check(await page.isVisible('[data-testid=ec-exception]'), 'Cr is flagged as an Aufbau exception');
  await page.click('[data-testid=pt-P]');
  check((await page.textContent('[data-testid=ec-rep-full]')).includes('1s2 2s2 2p6 3s2 3p3'), 'P full notation 1s² 2s² 2p⁶ 3s² 3p³');
  check((await page.$eval('[data-testid=ec-rep-dots] [data-testid=dot-symbol]', (el) => el.dataset.dots)) === '1,2,1,1', 'P dot symbol has 5 dots (one pair)');
  await page.screenshot({ path: `${out}/electrons-explore.png`, fullPage: true });

  await page.getByRole('radio', { name: /تدرّب|Practise/ }).click();
  const fb = (task) => page.$eval(`[data-testid=ec-feedback-${task}]`, (el) => ({ correct: el.dataset.correct, code: el.dataset.code, text: el.textContent }));
  await page.fill('[data-testid=ec-input-full]', '1s2 2s2 2p6 3s2 3p4');
  await page.click('[data-testid=ec-check-full]');
  let f = await fb('full');
  check(f.correct === 'false' && f.code === 'wrong-total' && f.text.includes('16') && f.text.includes('15'), `wrong total → ❌ "${f.text.slice(0, 90)}"`);
  await page.fill('[data-testid=ec-input-full]', '1s²2s²2p⁶3s²3p³');
  await page.click('[data-testid=ec-check-full]');
  check((await fb('full')).correct === 'true', 'correct full notation (with superscripts) → ✅');
  await page.fill('[data-testid=ec-input-noble]', '[He] 2s2 2p6 3s2 3p3');
  await page.click('[data-testid=ec-check-noble]');
  check((await fb('noble')).code === 'core-not-previous', 'wrong noble-gas core → named diagnosis');
  const tap = (id) => page.click(`[data-testid=${id}]`);
  for (const sub of ['1s', '2s', '3s']) for (const id of [`box-${sub}-0-0`, `box-${sub}-0-1`, `box-${sub}-0-1`]) await tap(id);
  for (let i = 0; i < 3; i++) for (const id of [`box-2p-${i}-0`, `box-2p-${i}-1`, `box-2p-${i}-1`]) await tap(id);
  for (const id of ['box-3p-0-0', 'box-3p-0-1', 'box-3p-0-1', 'box-3p-1-0']) await tap(id);
  await tap('ec-check-boxes');
  check((await fb('boxes')).code === 'hund-pairing', 'pairing in 3p while an orbital is empty → Hund’s rule diagnosis');
  await tap('box-3p-0-1'); // ↓ → empty: the pair becomes a single ↑
  await tap('box-3p-2-0');
  await tap('ec-check-boxes');
  check((await fb('boxes')).correct === 'true', 'corrected orbital diagram → ✅');
  for (const id of ['dot-side-0', 'dot-side-0', 'dot-side-1', 'dot-side-1', 'dot-side-2']) await tap(id);
  await tap('ec-check-dots');
  check((await fb('dots')).code === 'dots-paired-early', 'pairs before spreading dots → diagnosis');
  await tap('dot-side-0');
  await tap('dot-side-0');
  await tap('dot-side-3');
  await tap('ec-check-dots');
  check((await fb('dots')).correct === 'true', 'corrected dot symbol → ✅');
  await page.screenshot({ path: `${out}/electrons-practice.png`, fullPage: true });

  console.log('10. Textbook Table 6-4 in the library');
  await page.goto(`${base}#library`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=book-table]', { timeout: 10000 }).catch(() => {});
  check(await page.isVisible('[data-testid=book-table]'), 'textbook table shown');
  check((await page.$eval('[data-testid=book-row-ph3]', (el) => el.dataset.angleDiffers)) === 'true', 'PH₃: textbook 107.3° flagged against measured 93.3°');
  check((await page.$$('[data-testid^=book-row-]')).length === 7, 'all seven textbook molecules listed');
  await page.screenshot({ path: `${out}/book-table.png`, fullPage: true });

  console.log('11. Electron-configuration challenge');
  await page.goto(`${base}#challenges`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=start-level-2]', { timeout: 10000 });
  await page.getByRole('radio', { name: /التوزيع الإلكتروني|Electron configuration/ }).click();
  await page.click('[data-testid=start-level-2]');
  await page.waitForSelector('[data-testid=question-prompt]');
  if (await page.$('[data-testid=answer-number]')) await page.fill('[data-testid=answer-number]', '999');
  else await page.click('[role=radiogroup] button >> nth=0');
  await page.click('[data-testid=submit-answer]');
  check(await page.locator('[role=status]').first().isVisible(), 'electron question gets instant feedback');
  await page.screenshot({ path: `${out}/challenge-electrons.png` });

  console.log('12. Touch screen (phone): everything by tapping');
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tp = await phone.newPage();
  tp.on('pageerror', (e) => errors.push(e.message));
  await tp.goto(`${base}#lab`, { waitUntil: 'networkidle' });
  await tp.waitForSelector('[data-testid=view-controls-fold]', { timeout: 15000 });
  const cam = () => tp.$eval('[data-testid=molecule-viewer]', (el) => ({ az: Number(el.dataset.cameraAzimuth), dist: Number(el.dataset.cameraDistance) }));
  await tp.waitForTimeout(1500);
  check((await tp.$eval('[data-testid=view-controls]', (el) => el.dataset.collapsed)) === 'true', 'phone: view buttons start folded so they do not cover the molecule');
  check((await tp.$eval('[data-testid=viewport-summary]', (el) => el.dataset.collapsed)) === 'true', 'phone: info card starts folded');
  const tabY = await tp.$eval('[data-testid=mtab-practice]', (el) => [el.getAttribute('aria-selected'), el.getBoundingClientRect().top]);
  const viewY = await tp.$eval('[data-testid=lab-viewport]', (el) => el.getBoundingClientRect().top);
  check(tabY[0] === 'true' && tabY[1] < viewY, 'phone: "Solve it yourself" tab is above the 3D view and selected');
  await tp.tap('[data-testid=view-controls-fold]');
  const c0 = await cam();
  await tp.tap('[data-testid=view-rotate-right]');
  await tp.tap('[data-testid=view-rotate-right]');
  await tp.tap('[data-testid=view-zoom-in]');
  await tp.waitForTimeout(900);
  const c1 = await cam();
  const turned = Math.abs(((c1.az - c0.az + 540) % 360) - 180);
  check(Math.abs(turned - 30) < 3, `rotate buttons turn the model (${c0.az}° → ${c1.az}°)`);
  check(c1.dist < c0.dist - 0.3, `zoom button brings the camera closer (${c0.dist} → ${c1.dist})`);
  await tp.tap('[data-testid=pad-valence-key-8]');
  await tp.tap('[data-testid=check-valence]');
  check(await tp.locator('[data-testid=practice-step-valence] [role=status]').first().innerText().then((x) => x.includes('✅')), 'number pad: NH₃ valence 8 entered by tapping → ✅');
  await tp.tap('[data-testid=pad-bonding-chip-3]');
  await tp.tap('[data-testid=check-bonding]');
  check(await tp.locator('[data-testid=practice-step-bonding] [role=status]').first().innerText().then((x) => x.includes('✅')), 'quick-pick button: 3 bonding pairs → ✅');
  await tp.screenshot({ path: `${out}/touch-lab.png`, fullPage: true });
  // Touching the model in another tab points to the tab where a finger changes the angle.
  await tp.tap('[data-testid=view-controls-fold]');
  await tp.tap('[data-testid=camera-reset]');
  const stageBox = await tp.locator('[data-testid=molecule-viewer]').boundingBox();
  await tp.touchscreen.tap(stageBox.x + 24, stageBox.y + stageBox.height / 2);
  await tp.waitForSelector('[data-testid=angle-tab-nudge]', { timeout: 5000 });
  await tp.tap('[data-testid=angle-tab-nudge]');
  check((await tp.getAttribute('[data-testid=mtab-angle]', 'aria-selected')) === 'true', 'phone: touching the model offers «change the angle», one tap opens it');
  await tp.waitForSelector('[data-testid=angle-live]', { timeout: 15000 });
  await tp.waitForTimeout(1500);
  await tp.waitForFunction(() => {
    const d = document.querySelector('[data-testid=molecule-viewer]')?.dataset;
    return !!d && d.renderedFor === d.sceneKey && d.settled === 'true';
  });
  const liveNow = () => tp.$eval('[data-testid=angle-live]', (el) => ({ value: Number(el.dataset.value), live: el.dataset.live }));
  check((await tp.$$('[data-label-key^="grab-"]')).length === 3, 'phone: the three H atoms that can be dragged are circled');
  // Bend with a finger, pressing beside the H atom rather than exactly on it.
  const touch = await phone.newCDPSession(tp);
  const th = await tp.locator('[data-label-key="atom-1"]').boundingBox();
  const a0 = (await liveNow()).value;
  const az0 = (await cam()).az;
  const tx = th.x + th.width / 2 + 26;
  const ty = th.y + th.height / 2 + 6;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let k = 1; k <= 10; k++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty + 5 * k }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tp.waitForTimeout(600);
  const a1 = await liveNow();
  const az1 = (await cam()).az;
  check(a1.value < a0 - 2 && Math.abs(az1 - az0) < 2 && (a1.live === 'ok' || a1.live === 'bad'), `phone: a finger beside an H atom grabs it and bends NH₃ (${a0}° → ${a1.value}°, ${a1.live === 'ok' ? '✅' : '❌'}) without turning the view`);
  check((await tp.$$('[data-label-key^="grab-"]')).length === 0, 'phone: the circles go away once the student has bent the molecule');
  await tp.tap('[data-testid=angle-live-plus]');
  const a2 = (await liveNow()).value;
  check(Math.abs(a2 - (a1.value + 0.5)) < 1e-6, `phone: + on the model adds 0.5° (${a1.value}° → ${a2}°)`);
  const mb = await tp.locator('[data-testid=angle-live-minus]').boundingBox();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: mb.x + mb.width / 2, y: mb.y + mb.height / 2 }] });
  await tp.waitForTimeout(1100);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const a3 = (await liveNow()).value;
  check(a3 <= a2 - 2, `phone: holding − on the model keeps closing the angle (${a2}° → ${a3}°)`);
  // Two fingers on two atoms open or close the angle; the view does not zoom.
  await tp.tap('[data-testid=chip-h2o]');
  await tp.waitForTimeout(1500);
  await tp.waitForFunction(() => {
    const d = document.querySelector('[data-testid=molecule-viewer]')?.dataset;
    return !!d && d.renderedFor === d.sceneKey && d.settled === 'true';
  });
  const w0 = await liveNow();
  const d0 = (await cam()).dist;
  const f1 = await tp.locator('[data-label-key="atom-1"]').boundingBox();
  const f2 = await tp.locator('[data-label-key="atom-2"]').boundingBox();
  const q1 = { x: f1.x + f1.width / 2, y: f1.y + f1.height / 2 };
  const q2 = { x: f2.x + f2.width / 2, y: f2.y + f2.height / 2 };
  const mid = { x: (q1.x + q2.x) / 2, y: (q1.y + q2.y) / 2 + 40 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...q1, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...q1, id: 1 }, { ...q2, id: 2 }] });
  for (let k = 1; k <= 12; k++) {
    const f = (k / 12) * 0.55;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: q1.x + (mid.x - q1.x) * f, y: q1.y + (mid.y - q1.y) * f, id: 1 },
        { x: q2.x + (mid.x - q2.x) * f, y: q2.y + (mid.y - q2.y) * f, id: 2 },
      ],
    });
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tp.waitForTimeout(600);
  const w1 = await liveNow();
  const d1 = (await cam()).dist;
  check(w1.value < w0.value - 20 && Math.abs(d1 - d0) < 0.5, `phone: two fingers on the two H atoms of H₂O close the angle (${w0.value}° → ${w1.value}°) without zooming (${d0} → ${d1})`);
  await tp.locator('[data-testid=angle-slider]').fill('130');
  check((await liveNow()).value === 130, 'phone: the slider under the model sets the angle (130°)');
  // "Show me how": a hand drags an atom, uses two fingers, taps − and +, then puts the angle back.
  await tp.tap('[data-testid=angle-demo-start-toolbar]');
  await tp.waitForSelector('[data-testid=angle-demo]');
  const demoAngles = new Set();
  const steps = new Set();
  let maxHands = 0;
  for (let i = 0; i < 80 && (await tp.$('[data-testid=angle-demo]')); i++) {
    demoAngles.add((await liveNow()).value);
    maxHands = Math.max(maxHands, await tp.locator('[data-testid=angle-demo-hand]').count());
    const cap = await tp.locator('[data-testid=angle-demo-caption]').textContent().catch(() => '');
    if (cap) steps.add(cap.trim().slice(0, 2));
    await tp.waitForTimeout(150);
  }
  const restored = (await liveNow()).value;
  check(steps.size === 4 && maxHands === 2 && demoAngles.size > 4 && restored === 130, `phone: «وريني كيف» shows 4 steps with one and two hands, really moves the model (${demoAngles.size} angles), then puts it back (${restored}°)`);
  await tp.screenshot({ path: `${out}/touch-bend.png`, fullPage: true });

  await tp.goto(`${base}#predict`, { waitUntil: 'networkidle' });
  await tp.waitForSelector('[data-testid=predict-eg]', { timeout: 15000 });
  await tp.tap('[data-testid=predict-eg-tetrahedral]');
  await tp.tap('[data-testid=predict-mg-bent]');
  await tp.tap('[data-testid=predict-angle-lt109]');
  if (await tp.$('[data-testid=predict-estimate]')) await tp.tap('[data-testid="predict-estimate-preset-104.5"]');
  await tp.tap('[data-testid=predict-reveal]');
  check(await tp.isVisible('[data-testid=predict-results]'), 'predict: shapes and angle chosen by tapping, then revealed');
  await tp.screenshot({ path: `${out}/touch-predict.png`, fullPage: true });

  await tp.goto(`${base}#electrons`, { waitUntil: 'networkidle' });
  await tp.waitForSelector('[data-testid=electrons-page]', { timeout: 15000 });
  await tp.getByRole('radio', { name: /تدرّب|Practise/ }).tap();
  await tp.tap('[data-testid=pt-Al]');
  await tp.tap('[data-testid=ec-kbd-noble-core-Ne]');
  for (const sub of ['3s', '3p']) await tp.tap(`[data-testid=ec-kbd-noble-sub-${sub}]`);
  await tp.tap('[data-testid=ec-kbd-noble-count-1]');
  await tp.tap('[data-testid=ec-check-noble]');
  check((await tp.$eval('[data-testid=ec-feedback-noble]', (el) => el.dataset.correct)) === 'true', `electron keyboard: [Ne] 3s² 3p¹ for Al by tapping → ✅ (${(await tp.inputValue('[data-testid=ec-input-noble]')).trim()})`);
  await tp.screenshot({ path: `${out}/touch-electrons.png`, fullPage: true });

  await tp.goto(`${base}#preferences`, { waitUntil: 'networkidle' });
  await tp.waitForSelector('[data-testid=preferences-page]', { timeout: 15000 });
  await tp.getByRole('radio', { name: 'كبير جدًا' }).tap();
  check((await tp.evaluate(() => document.documentElement.style.fontSize)) === '125%', 'text size setting enlarges the whole interface');
  await phone.close();

  console.log('13. Language switch');
  await page.goto(`${base}#lab`, { waitUntil: 'networkidle' });
  await page.click('[data-testid=lang-toggle]');
  check((await page.evaluate(() => document.documentElement.dir)) === 'ltr', 'English switches the page to left-to-right');
  await page.click('[data-testid=lang-toggle]');
  check((await page.evaluate(() => document.documentElement.dir)) === 'rtl', 'Arabic switches back to right-to-left');

  console.log('14. Cover page (first page) and sound switch');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=home-page]', { timeout: 10000 });
  const cover = await page.textContent('[data-testid=home-page]');
  check(
    ['مدرسة الفيصلية', 'مشروع الشعبة 201', 'تركيب الجزيئات', 'تصميم وتنفيذ الطالب', 'عوض الحربي', 'تحت إشراف المعلم الفاضل', 'الأستاذ أشرف صلاح'].every((x) => cover.includes(x)),
    'the site opens on the cover: school, section 201, «تركيب الجزيئات», student and supervisor',
  );
  await page.click('[data-testid=home-start]');
  await page.waitForSelector('[data-testid=molecule-viewer]');
  check(page.url().endsWith('#lab') && (await page.getAttribute('[data-testid=tab-practice]', 'aria-selected')) === 'true', '«ابدأ المشروع» opens the lab on «حل بنفسك»');
  await page.click('[data-testid=sound-toggle]');
  const quietFrom = await page.evaluate(() => window.__cues.length);
  await page.fill('#practice-valence', '3');
  await page.click('[data-testid=check-valence]');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__cues.length)) === quietFrom && (await page.textContent('[data-testid=sound-toggle]')).includes('🔇'), '🔇 in the header mutes every sound');
  await page.click('[data-testid=sound-toggle]');
  await page.click('[data-testid=logo-link]');
  const coverBack = await page.waitForSelector('[data-testid=home-page]', { timeout: 5000 }).then(() => true, () => false);
  check(page.url().endsWith('#home') && coverBack, 'the logo goes back to the cover');

  console.log('15. Menu links stay inside the app, even when a viewer adds a <base> (htmlpreview.github.io does)');
  const addBase = (pg) =>
    pg.evaluate(() => {
      const b = document.createElement('base');
      b.href = 'https://raw.example.org/repo/docs/index.html';
      document.head.prepend(b);
    });
  await page.goto(`${base}#lab`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=molecule-viewer]');
  const doc = page.url().split('#')[0];
  await addBase(page);
  const visited = [];
  for (const r of ['challenges', 'library', 'electrons', 'predict', 'history', 'references', 'preferences', 'lab']) {
    await page.click(`[data-testid=nav-${r}]`);
    await page.waitForFunction((h) => location.hash === h, `#${r}`, { timeout: 5000 }).catch(() => {});
    if (page.url() === `${doc}#${r}`) visited.push(r);
  }
  check(visited.length === 8, `every menu link stays in the app with a foreign <base> (${visited.join(', ')})`);
  await page.click('[data-testid=nav-challenges]');
  const challengesShown = await page.waitForSelector('[data-testid=start-level-1]', { state: 'visible', timeout: 10000 }).then(() => true, () => false);
  check(challengesShown && page.url() === `${doc}#challenges`, 'the challenges page opens (no page source shown)');
  await page.click('footer a[href="#references"]');
  check(page.url() === `${doc}#references`, 'the footer link stays in the app too');
  const phone2 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tp2 = await phone2.newPage();
  tp2.on('pageerror', (e) => errors.push(e.message));
  await tp2.goto(`${base}#lab`, { waitUntil: 'networkidle' });
  await tp2.waitForSelector('[data-testid=molecule-viewer]');
  await addBase(tp2);
  await tp2.tap('[data-testid=menu-toggle]');
  await tp2.tap('[data-testid=mnav-challenges]');
  await tp2.waitForSelector('[data-testid=start-level-1]', { timeout: 10000 }).catch(() => {});
  check(tp2.url() === `${doc}#challenges` && (await tp2.isVisible('[data-testid=start-level-1]')), 'phone: «التحديات» in the menu opens the challenges inside the app');
  await phone2.close();

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
