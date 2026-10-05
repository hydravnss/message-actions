// Test Actions Message — SillyTavern 1.19.0, Playwright WebKit, iPhone 14 Pro.
// Extension liée dans data/default-user/extensions/message-actions.
// Captures : $SHOTS (défaut /workspace/st-test-shots/ma-*.png).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pwRoot = '/workspace/portrait-lignes/test/node_modules/playwright';
const { webkit, devices } = require(pwRoot);

const SH = (process.env.SHOTS || '/workspace/st-test-shots') + '/ma-';
const URL = process.env.ST_URL || 'http://localhost:8000/';
const R = [];
const ok = (n, c, d = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', n, c ? '' : '→ ' + d); };
const wait = async (_p, ms) => new Promise((r) => setTimeout(r, ms));
const NOISE = /Viewport argument key "interactive-widget" not recognized/;

async function launch(scheme = 'dark') {
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 14 Pro'], colorScheme: scheme });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !NOISE.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300));
    if (m.type() === 'warning' && /Actions Message/.test(m.text())) errs.push('WARN ' + m.text());
  });
  return { b, ctx, page, errs };
}

async function loadChat(page) {
  await page.evaluate(async () => {
    const c = SillyTavern.getContext();
    await c.selectCharacterById(1);
    await new Promise((r) => setTimeout(r, 2000));
    const x = SillyTavern.getContext();
    x.chat.length = 0; document.querySelector('#chat').innerHTML = '';
    const add = (m) => { x.chat.push(m); x.addOneMessage(m); };
    add({ name: x.name2, is_user: false, is_system: false, send_date: Date.now(), mes: '*Elle lève les yeux.* « Tu es là. »' });
    add({ name: 'Moi', is_user: true, is_system: false, send_date: Date.now(), mes: 'Bonsoir !' });
    add({ name: x.name2, is_user: false, is_system: false, send_date: Date.now(), mes: '*Elle sourit.* Assieds-toi.' });
  });
  await wait(page, 700);
}

const PROT = ['#form_sheld', '#send_form', '#send_textarea', '#top-bar'];
const PROPS = ['backgroundColor', 'color', 'position', 'fontFamily', 'boxShadow'];
const protSnap = (page) => page.evaluate(([sels, props]) => {
  document.activeElement?.blur?.();
  return Object.fromEntries(sels.map((s) => {
    const el = document.querySelector(s); if (!el) return [s, 'ABSENT'];
    const c = getComputedStyle(el);
    return [s, Object.fromEntries(props.map((p) => [p, c[p]]))];
  }));
}, [PROT, PROPS]);

const btnInfo = (page) => page.evaluate(() => {
  const mes = document.querySelector('#chat .mes[is_user="false"]') || document.querySelector('#chat .mes');
  if (!mes) return null;
  const btns = mes.querySelector('.mes_buttons');
  if (!btns) return { has: false };
  const cs = getComputedStyle(btns);
  const r = btns.getBoundingClientRect();
  const mr = mes.getBoundingClientRect();
  const edit = btns.querySelector('.mes_edit');
  const editOp = edit ? getComputedStyle(edit).opacity : null;
  const editDisp = edit ? getComputedStyle(edit).display : null;
  return {
    has: true,
    opacity: cs.opacity,
    position: cs.position,
    display: cs.display,
    transform: cs.transform,
    rect: [r.left, r.top, r.width, r.height].map(Math.round),
    mesRect: [mr.left, mr.top, mr.width, mr.height].map(Math.round),
    editOp, editDisp,
    style: !!document.getElementById('message-actions-style'),
    css: document.getElementById('message-actions-style')?.textContent || '',
    nearTop: r.top - mr.top < 36,
    nearBottom: (mr.bottom - r.bottom) < 36,
    nearRight: (mr.right - r.right) < 36,
    nearLeft: (r.left - mr.left) < 36,
  };
});

const setRange = (page, id, v) => page.evaluate(([id, v]) => {
  const e = document.getElementById(id); e.value = String(v);
  e.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, v]);

async function waitReady(page, ms = 20000) {
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  while (Date.now() - t0 < ms) {
    const okReady = await page.evaluate(() => !!(window.MessageActions && document.getElementById('ma_settings') && window.SillyTavern?.getContext));
    if (okReady) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const { b, page, errs } = await launch('dark');
ok('extension chargée (API window.MessageActions + panneau #ma_settings)', await waitReady(page));
await page.evaluate(() => MessageActions.reset());
await loadChat(page);

// --- Désactivé
await page.evaluate(() => MessageActions.set({ enabled: false })); await wait(page, 400);
const offProt = await protSnap(page);
const offB = await btnInfo(page);
ok('désactivé : <style> retiré', !offB?.style);
await page.screenshot({ path: SH + '0-desactive.png' });

// --- Activé défauts (toujours visibles, haut-droite)
await page.evaluate(() => MessageActions.set({ enabled: true, alwaysVisible: true, position: 'top-right', offsetX: 0, offsetY: 0, scale: 100, opacity: 1 }));
await wait(page, 400);
let B = await btnInfo(page);
let prot = await protSnap(page);
ok('activé : <style> présent', !!B?.style);
ok('actions visibles sans hover (opacité conteneur = 1, bouton edit ≥ 0.9)',
  B && B.opacity === '1' && Number(B.editOp) >= 0.9, JSON.stringify(B));
ok('position absolute en haut à droite du message',
  B && B.position === 'absolute' && B.nearTop && B.nearRight, JSON.stringify(B));
ok('CSS ne mentionne pas sendbar / top-bar / stickers / font-family',
  B && !/form_sheld|send_form|send_textarea|top-bar|sticker|font-family/.test(B.css.replace(/^\/\*.*\*\/$/m, '')));
ok('barre saisie / haut STRICTEMENT identiques', JSON.stringify(prot) === JSON.stringify(offProt),
  JSON.stringify([offProt, prot]).slice(0, 400));
await page.evaluate(() => document.querySelector('#chat').scrollTo(0, 0));
await page.screenshot({ path: SH + '1-toujours-visibles-haut-droite.png' });

// --- Déplacement bas-gauche + offsets
await page.evaluate(() => MessageActions.set({ position: 'bottom-left', offsetX: 10, offsetY: -4, scale: 120, opacity: 0.85 }));
await wait(page, 400);
B = await btnInfo(page);
ok('bas-gauche : nearBottom + nearLeft', B && B.nearBottom && B.nearLeft, JSON.stringify(B));
ok('échelle / opacité appliquées (transform scale + edit opacity)',
  B && /matrix|scale/.test(B.transform) && Number(B.editOp) >= 0.8, JSON.stringify({ t: B.transform, op: B.editOp }));
await page.screenshot({ path: SH + '2-bas-gauche.png' });

// --- Sous le message
await page.evaluate(() => MessageActions.set({ position: 'below', offsetX: 0, offsetY: 0, scale: 100, opacity: 1 }));
await wait(page, 400);
B = await btnInfo(page);
ok('sous le message : nearBottom', B && B.nearBottom, JSON.stringify(B));
await page.screenshot({ path: SH + '3-sous-message.png' });

// --- Masquer éditer
await page.evaluate(() => MessageActions.set({ position: 'top-right', hide: { edit: true } }));
await wait(page, 300);
B = await btnInfo(page);
ok('masquer Éditer : display none', B && B.editDisp === 'none', JSON.stringify(B));
await page.evaluate(() => MessageActions.set({ hide: { edit: false } }));
await wait(page, 200);

// --- Panneau FR
await page.click('#extensions-settings-button .drawer-toggle'); await wait(page, 800);
await page.evaluate(() => { const d = document.querySelector('#ma_settings .inline-drawer-toggle'); d.scrollIntoView(); d.click(); });
await wait(page, 700);
const panel = await page.evaluate(() => {
  const r = document.getElementById('ma_settings');
  return {
    visible: r.querySelector('.inline-drawer-content').offsetHeight > 80,
    ids: [...r.querySelectorAll('input,select')].map((e) => e.id),
    txt: r.textContent,
  };
});
ok('panneau ouvert, français, réglages présents',
  panel.visible
  && ['ma_enabled', 'ma_always', 'ma_position', 'ma_r_offsetX', 'ma_r_offsetY', 'ma_r_scale', 'ma_r_opacity'].every((i) => panel.ids.includes(i))
  && /Toujours visibles|Placement|Masquer des actions/.test(panel.txt),
  JSON.stringify({ ids: panel.ids, sample: panel.txt.slice(0, 120) }));
await page.evaluate(() => document.querySelector('#ma_settings .inline-drawer-header').scrollIntoView({ block: 'start' }));
await wait(page, 300);
await page.screenshot({ path: SH + '4-panneau.png' });

// Modifier via UI
await page.selectOption('#ma_position', 'top-left'); await wait(page, 150);
await setRange(page, 'ma_r_offsetX', 16); await wait(page, 100);
await setRange(page, 'ma_r_offsetY', 8); await wait(page, 100);
await setRange(page, 'ma_r_scale', 110); await wait(page, 100);
const saved = await page.evaluate(() => JSON.parse(JSON.stringify(SillyTavern.getContext().extensionSettings.message_actions)));
ok('réglages enregistrés (top-left, offsets, scale)',
  saved.position === 'top-left' && saved.offsetX === 16 && saved.offsetY === 8 && saved.scale === 110,
  JSON.stringify(saved));
await page.click('#extensions-settings-button .drawer-toggle'); await wait(page, 600);
B = await btnInfo(page);
ok('UI → haut-gauche appliqué', B && B.nearTop && B.nearLeft, JSON.stringify(B));
await page.evaluate(() => document.querySelector('#chat').scrollTo(0, 0));
await page.screenshot({ path: SH + '5-reglages-ui.png' });

// --- Compat
const compat = await page.evaluate(() => ({
  pl: !!window.PortraitLignes,
  fld: !!window.ForceLightDark,
  maStyle: !!document.getElementById('message-actions-style'),
  plStyle: !!document.getElementById('portrait-lignes-style'),
}));
ok('Actions Message actif (autres extensions OK si présentes)',
  compat.maStyle, JSON.stringify(compat));
prot = await protSnap(page);
ok('sendbar / top-bar toujours intacts après réglages', JSON.stringify(prot) === JSON.stringify(offProt));

// --- Persistance
await wait(page, 2500);
await page.reload({ waitUntil: 'domcontentloaded' });
{
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    if (await page.evaluate(() => !!window.MessageActions)) break;
    await new Promise((r) => setTimeout(r, 400));
  }
}
await loadChat(page);
const after = await page.evaluate(() => MessageActions.getSettings());
B = await btnInfo(page);
ok('persistance après reload (top-left / scale 110)',
  after.position === 'top-left' && after.scale === 110 && B?.nearLeft,
  JSON.stringify({ after, B }));

// --- alwaysVisible off
await page.evaluate(() => MessageActions.set({ alwaysVisible: false, position: 'top-right' }));
await wait(page, 300);
B = await btnInfo(page);
ok('alwaysVisible off : boutons moins opaques sans hover',
  B && Number(B.editOp) < 0.5, JSON.stringify(B));
await page.screenshot({ path: SH + '6-hover-only.png' });

await page.evaluate(() => MessageActions.set({ alwaysVisible: true, enabled: true }));
await wait(page, 200);

const consoleClean = errs.filter((e) => !/favicon|404|Failed to load resource/.test(e));
ok('0 erreur console / pageerror (hors bruit réseau)', consoleClean.length === 0, consoleClean.join(' | '));
await b.close();

const pass = R.filter(Boolean).length;
console.log('\n===', pass + '/' + R.length, 'PASS ===');
process.exit(pass === R.length ? 0 : 1);
