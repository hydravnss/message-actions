/**
 * Actions Message — extension SillyTavern (v1.0.0) — hydravnss
 *
 * Place et garde visibles les boutons d'action de chaque message (.mes_buttons :
 * éditer, copier, …, ellipse, etc.). Réglages FR dans Extensions.
 *
 * - Toujours visibles (opacity constante, pas seulement au hover / tap)
 * - Placement libre : coins ou sous le message + offsets X/Y
 * - Taille (échelle) et opacité réglables
 * - Masquage d'actions individuelles
 * - Ne touche PAS #form_sheld / #send_form / #send_textarea / #top-bar / fond #chat /
 *   stickers / Force Light Dark — uniquement .mes_buttons (et optionnellement opacité des swipes)
 *
 * Mécanisme : <style id="message-actions-style"> régénéré à chaque réglage.
 * Spécificité (4 id) + append en fin de <head> pour passer devant Portrait Lignes.
 * Réglages : extension_settings.message_actions
 */

const KEY = 'message_actions';
const LOG = '[Actions Message]';
const STYLE_ID = 'message-actions-style';

export const POSITIONS = Object.freeze([
    { id: 'top-right', label: 'Haut droite' },
    { id: 'top-left', label: 'Haut gauche' },
    { id: 'bottom-right', label: 'Bas droite' },
    { id: 'bottom-left', label: 'Bas gauche' },
    { id: 'below', label: 'Sous le message' },
]);

/** Actions individuelles masquables (sélecteur CSS → libellé FR). */
export const HIDEABLE = Object.freeze([
    { id: 'edit', sel: '.mes_edit', label: 'Éditer' },
    { id: 'copy', sel: '.mes_copy', label: 'Copier' },
    { id: 'ellipsis', sel: '.extraMesButtonsHint', label: 'Menu … (ellipse)' },
    { id: 'bookmark', sel: '.mes_bookmark, .mes_create_bookmark', label: 'Checkpoint / drapeau' },
    { id: 'translate', sel: '.mes_translate', label: 'Traduire' },
    { id: 'narrate', sel: '.mes_narrate', label: 'Narration' },
    { id: 'image', sel: '.sd_message_gen', label: 'Générer image' },
    { id: 'hide', sel: '.mes_hide, .mes_unhide', label: 'Masquer / afficher au prompt' },
    { id: 'embed', sel: '.mes_embed', label: 'Joindre fichier' },
    { id: 'branch', sel: '.mes_create_branch', label: 'Créer une branche' },
    { id: 'swipePicker', sel: '.mes_swipe_picker', label: 'Historique des swipes' },
    { id: 'media', sel: '.mes_media_gallery, .mes_media_list', label: 'Galerie média' },
    { id: 'prompt', sel: '.mes_prompt', label: 'Prompt' },
]);

export const DEFAULTS = Object.freeze({
    enabled: true,
    alwaysVisible: true,
    position: 'top-right',
    offsetX: 0,
    offsetY: 0,
    scale: 100,
    opacity: 1,
    expandExtras: false,
    swipeVisible: true,
    hide: Object.freeze(Object.fromEntries(HIDEABLE.map((h) => [h.id, false]))),
});

export const RANGES = Object.freeze({
    offsetX: [-80, 80, 1],
    offsetY: [-80, 80, 1],
    scale: [70, 160, 1],
    opacity: [0.2, 1, 0.05],
});

const POS_IDS = new Set(POSITIONS.map((p) => p.id));
const HIDE_IDS = new Set(HIDEABLE.map((h) => h.id));

export function sanitize(src) {
    const o = (src && typeof src === 'object') ? src : {};
    const s = {};
    s.enabled = typeof o.enabled === 'boolean' ? o.enabled : DEFAULTS.enabled;
    s.alwaysVisible = typeof o.alwaysVisible === 'boolean' ? o.alwaysVisible : DEFAULTS.alwaysVisible;
    s.expandExtras = typeof o.expandExtras === 'boolean' ? o.expandExtras : DEFAULTS.expandExtras;
    s.swipeVisible = typeof o.swipeVisible === 'boolean' ? o.swipeVisible : DEFAULTS.swipeVisible;
    s.position = POS_IDS.has(o.position) ? o.position : DEFAULTS.position;
    for (const [k, [lo, hi, step]] of Object.entries(RANGES)) {
        const v = Number(o[k]);
        if (!Number.isFinite(v)) { s[k] = DEFAULTS[k]; continue; }
        const r = Math.round(Math.min(hi, Math.max(lo, v)) / step) * step;
        s[k] = k === 'opacity' ? Number(r.toFixed(2)) : r;
    }
    const hideIn = (o.hide && typeof o.hide === 'object') ? o.hide : {};
    s.hide = {};
    for (const id of HIDE_IDS) {
        s.hide[id] = typeof hideIn[id] === 'boolean' ? hideIn[id] : false;
    }
    return s;
}

function ctx() {
    try { return globalThis.SillyTavern?.getContext?.() ?? null; } catch { return null; }
}

let S = sanitize({});
function loadSettings() {
    const c = ctx();
    const store = c?.extensionSettings;
    S = sanitize(store?.[KEY]);
    if (store) store[KEY] = S;
    return S;
}
function save() {
    const c = ctx();
    if (c?.extensionSettings) c.extensionSettings[KEY] = S;
    try { c?.saveSettingsDebounced?.(); } catch (e) { console.warn(LOG, 'sauvegarde', e); }
}

/** Spécificité (4 id) — même famille que Portrait Lignes, append en fin de head. */
const P = 'html body #chat:not(#ma_a):not(#ma_b):not(#ma_c):not(#ma_d)';

function positionCss(pos, ox, oy) {
    // ox positif = vers la droite ; oy positif = vers le bas
    switch (pos) {
        case 'top-left':
            return `top: ${8 + oy}px !important; left: ${8 + ox}px !important; right: auto !important; bottom: auto !important;`;
        case 'bottom-right':
            return `top: auto !important; bottom: ${8 - oy}px !important; right: ${8 - ox}px !important; left: auto !important;`;
        case 'bottom-left':
            return `top: auto !important; bottom: ${8 - oy}px !important; left: ${8 + ox}px !important; right: auto !important;`;
        case 'below':
            return `top: auto !important; bottom: ${4 - oy}px !important; left: 50% !important; right: auto !important; transform: translateX(calc(-50% + ${ox}px));`;
        case 'top-right':
        default:
            return `top: ${8 + oy}px !important; right: ${8 - ox}px !important; left: auto !important; bottom: auto !important;`;
    }
}

export function buildCss(src) {
    const s = sanitize(src);
    if (!s.enabled) return '';
    const scale = (s.scale / 100).toFixed(3);
    const op = s.alwaysVisible ? s.opacity : Math.min(s.opacity, 0.35);
    const pos = positionCss(s.position, s.offsetX, s.offsetY);
    // transform sur le conteneur : pour « below » on a déjà translateX — on compose scale
    const transform = s.position === 'below'
        ? `transform: translateX(calc(-50% + ${s.offsetX}px)) scale(${scale}) !important; transform-origin: center bottom !important;`
        : `transform: scale(${scale}) !important; transform-origin: ${s.position.includes('left') ? 'left' : 'right'} ${s.position.includes('bottom') ? 'bottom' : 'top'} !important;`;

    const hideRules = HIDEABLE
        .filter((h) => s.hide[h.id])
        .map((h) => `${P} .mes .mes_buttons ${h.sel} { display: none !important; }`)
        .join('\n');

    const expand = s.expandExtras
        ? `${P} .mes .mes_buttons .extraMesButtons { display: flex !important; }
${P} .mes .mes_buttons .extraMesButtonsHint { display: none !important; }`
        : '';

    const swipe = s.swipeVisible
        ? `${P} .mes .swipe_left,
${P} .mes .swipe_right,
${P} .mes .swipes-counter {
  opacity: ${s.alwaysVisible ? Math.max(0.55, s.opacity) : 0.35} !important;
}`
        : '';

    const alwaysHover = s.alwaysVisible
        ? `${P} .mes .mes_buttons .mes_button,
${P} .mes .mes_buttons .extraMesButtons > div {
  opacity: ${op} !important;
}
${P} .mes .mes_buttons .mes_button:hover,
${P} .mes .mes_buttons .mes_button:active,
${P} .mes .mes_buttons .extraMesButtons > div:hover,
${P} .mes .mes_buttons .extraMesButtons > div:active {
  opacity: 1 !important;
}
${P} .mes .mes_buttons { opacity: 1 !important; }`
        : `${P} .mes .mes_buttons { opacity: 0.45; }
${P} .mes:hover .mes_buttons,
${P} .mes:focus-within .mes_buttons,
${P} .mes.ma-touch .mes_buttons { opacity: 1 !important; }
${P} .mes .mes_buttons .mes_button,
${P} .mes .mes_buttons .extraMesButtons > div { opacity: ${op}; }
${P} .mes:hover .mes_buttons .mes_button,
${P} .mes.ma-touch .mes_buttons .mes_button { opacity: 1 !important; }`;

    return `/* Actions Message v1.0.0 — généré. Uniquement .mes_buttons (+ swipes optionnels). */
${P} .mes {
  position: relative !important;
}
${P} .mes .mes_buttons,
${P} .mes .ch_name .mes_buttons,
${P} .mes .pl-header .mes_buttons {
  position: absolute !important;
  ${pos}
  z-index: 6 !important;
  margin: 0 !important;
  /* Ne pas forcer display : ST masque .mes_buttons pendant génération / animations */
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 4px !important;
  pointer-events: auto !important;
  ${transform}
  /* zone tactile un peu plus large */
  padding: 4px !important;
  -webkit-tap-highlight-color: transparent;
}
${alwaysHover}
${expand}
${swipe}
${hideRules}
/* Ne pas forcer mes_edit_buttons (mode édition ST) — laisser ST gérer display */
`;
}

/** Styles d'extensions amies : on ne se bat pas avec elles pour la fin de <head>
 *  (sinon boucle MutationObserver infinie). Notre spécificité (5 :not) bat Portrait Lignes. */
const FRIENDLY_STYLES = new Set([
    'portrait-lignes-style',
    'message-actions-style',
    'force-light-dark-style',
    'fixed-sendbar-style',
    'stickerpop-style',
]);
let headObserver = null;
let headMoveTimer = 0;
function scheduleHeadMove() {
    if (headMoveTimer) return;
    headMoveTimer = setTimeout(() => {
        headMoveTimer = 0;
        const el = document.getElementById(STYLE_ID);
        if (!el || !S.enabled || !document.head) return;
        const last = document.head.lastElementChild;
        if (last === el) return;
        // Si le dernier style est une extension amie, ne pas se battre.
        if (last && last.id && FRIENDLY_STYLES.has(last.id) && last.id !== STYLE_ID) return;
        document.head.appendChild(el);
    }, 50);
}
function observeHead() {
    if (typeof MutationObserver === 'undefined' || !document.head) return;
    if (headObserver) return;
    headObserver = new MutationObserver(() => scheduleHeadMove());
    headObserver.observe(document.head, { childList: true });
}
function stopHeadObserver() {
    headObserver?.disconnect();
    headObserver = null;
    if (headMoveTimer) { clearTimeout(headMoveTimer); headMoveTimer = 0; }
}

/** Sur tactile : un tap sur le message ajoute .ma-touch (utile si alwaysVisible est off). */
let touchBound = false;
function bindTouch() {
    if (touchBound) return;
    touchBound = true;
    const chat = document.getElementById('chat');
    if (!chat) return;
    chat.addEventListener('pointerdown', (ev) => {
        if (S.alwaysVisible || !S.enabled) return;
        const mes = ev.target?.closest?.('.mes');
        chat.querySelectorAll('.mes.ma-touch').forEach((el) => { if (el !== mes) el.classList.remove('ma-touch'); });
        mes?.classList.add('ma-touch');
    }, { passive: true });
}

// ---------------------------------------------------------------------------------------------------------------
// DOM : rattacher .mes_buttons directement sous .mes pour que position:absolute soit relatif au message entier
// (sinon, avec Portrait Lignes, le containing block est .pl-header position:relative).
// ---------------------------------------------------------------------------------------------------------------
let chatObserver = null;
let chatTimer = 0;
let chatEventsBound = false;

function pinButtons(mes) {
    if (!(mes instanceof Element) || !mes.classList?.contains('mes')) return;
    if (mes.classList.contains('smallSysMes')) return;
    const btns = mes.querySelector('.mes_buttons');
    if (!btns) return;
    if (btns.parentElement === mes) return;
    // mémoriser le parent d'origine (ch_name) pour restauration
    if (!btns.dataset.maOrig) {
        const home = btns.closest('.ch_name') || btns.parentElement;
        if (home) {
            // marqueur sur ch_name pour retrouver le slot
            home.dataset.maBtnsHost = '1';
            btns.dataset.maOrig = '1';
        }
    }
    mes.appendChild(btns);
}

function unpinButtons(mes) {
    if (!(mes instanceof Element)) return;
    const btns = [...mes.querySelectorAll(':scope > .mes_buttons')];
    for (const b of btns) {
        const host = mes.querySelector('.ch_name[data-ma-btns-host="1"]') || mes.querySelector('.ch_name');
        if (host) {
            host.appendChild(b);
            delete host.dataset.maBtnsHost;
        }
        delete b.dataset.maOrig;
    }
}

function pinAll() {
    document.querySelectorAll('#chat .mes').forEach(pinButtons);
}
function unpinAll() {
    document.querySelectorAll('#chat .mes').forEach(unpinButtons);
}

function schedulePin() {
    if (chatTimer) return;
    chatTimer = (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16))(() => {
        chatTimer = 0;
        if (S.enabled) pinAll();
    });
}

function observeChat() {
    if (typeof MutationObserver === 'undefined') return;
    const chat = document.getElementById('chat');
    if (!chat || chatObserver) return;
    chatObserver = new MutationObserver(() => { if (S.enabled) schedulePin(); });
    chatObserver.observe(chat, { childList: true, subtree: true });
}
function stopChatObserver() {
    chatObserver?.disconnect();
    chatObserver = null;
}

function bindChatEvents() {
    if (chatEventsBound) return;
    chatEventsBound = true;
    const c = ctx();
    const es = c?.eventSource;
    const et = c?.eventTypes || {};
    const bump = () => schedulePin();
    for (const k of [
        'MESSAGE_RECEIVED', 'MESSAGE_SENT', 'MESSAGE_EDITED', 'MESSAGE_DELETED',
        'MESSAGE_SWIPED', 'USER_MESSAGE_RENDERED', 'CHARACTER_MESSAGE_RENDERED',
        'CHAT_CHANGED', 'CHAT_CREATED', 'GROUP_UPDATED',
    ]) {
        const ev = et[k] || k.toLowerCase();
        try { es?.on?.(ev, bump); } catch { /* ignore */ }
    }
}

function apply() {
    const css = buildCss(S);
    let el = document.getElementById(STYLE_ID);
    if (!css) {
        el?.remove();
        document.documentElement.classList.remove('ma-active');
        unpinAll();
        stopChatObserver();
        stopHeadObserver();
        refreshStatus();
        return;
    }
    if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
    }
    if (el.textContent !== css) el.textContent = css;
    if (el.parentNode !== document.head || document.head.lastElementChild !== el) document.head.appendChild(el);
    document.documentElement.classList.add('ma-active');
    pinAll();
    observeChat();
    bindChatEvents();
    observeHead();
    bindTouch();
    refreshStatus();
}

const $id = (id) => document.getElementById(id);

function panelHtml() {
    const posOpts = POSITIONS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
    const hideRows = HIDEABLE.map((h) =>
        `<label class="checkbox_label" for="ma_hide_${h.id}"><input type="checkbox" id="ma_hide_${h.id}" data-hide="${h.id}"><span>${h.label}</span></label>`
    ).join('\n        ');
    const range = (k, label, unit) => {
        const [lo, hi, step] = RANGES[k];
        return `<label class="ma-row" for="ma_r_${k}"><span>${label} <small class="ma-val" id="ma_v_${k}"></small></span><input type="range" id="ma_r_${k}" data-key="${k}" data-unit="${unit}" min="${lo}" max="${hi}" step="${step}"></label>`;
    };
    return `<div id="ma_settings" class="ma-settings">
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>Actions Message</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <label class="checkbox_label" for="ma_enabled"><input type="checkbox" id="ma_enabled"><span>Activer Actions Message</span></label>
      <div id="ma_status" class="ma-status opacity50"></div>
      <div id="ma_body">
        <hr>
        <div class="ma-h"><b>Visibilité</b></div>
        <label class="checkbox_label" for="ma_always"><input type="checkbox" id="ma_always"><span>Toujours visibles (pas seulement au survol / tap)</span></label>
        <label class="checkbox_label" for="ma_expand"><input type="checkbox" id="ma_expand"><span>Développer toutes les actions (sans menu …)</span></label>
        <label class="checkbox_label" for="ma_swipe"><input type="checkbox" id="ma_swipe"><span>Rendre les swipes plus visibles</span></label>
        ${range('opacity', 'Opacité des boutons', '')}
        ${range('scale', 'Taille', '%')}
        <hr>
        <div class="ma-h"><b>Placement</b></div>
        <label for="ma_position">Position</label>
        <select id="ma_position" class="text_pole">${posOpts}</select>
        ${range('offsetX', 'Décalage horizontal (X)', 'px')}
        ${range('offsetY', 'Décalage vertical (Y)', 'px')}
        <hr>
        <div class="ma-h"><b>Masquer des actions</b></div>
        <small class="opacity50">Cochez pour cacher un bouton précis.</small>
        ${hideRows}
        <hr>
        <div id="ma_reset" class="menu_button">Valeurs par défaut</div>
        <small class="opacity50">Ne modifie que les boutons d'action des messages. Barre d'envoi, thème, stickers et Portrait Lignes (hors .mes_buttons) restent intacts.</small>
      </div>
    </div>
  </div>
</div>`;
}

function fmt(k, v, unit) {
    if (k === 'opacity') return `${Math.round(Number(v) * 100)} %`;
    if (k === 'scale') return `${v} %`;
    return `${v} ${unit}`;
}

function refreshStatus() {
    const st = $id('ma_status');
    if (!st) return;
    if (!S.enabled) {
        st.textContent = 'Désactivé : boutons d\'action gérés par le thème / ST.';
        return;
    }
    const pos = POSITIONS.find((p) => p.id === S.position)?.label || S.position;
    st.textContent = S.alwaysVisible
        ? `Actif : actions toujours visibles — ${pos}, échelle ${S.scale} %, opacité ${Math.round(S.opacity * 100)} %.`
        : `Actif : visibles au survol / tap — ${pos}.`;
}

function refreshUi() {
    if (!$id('ma_settings')) return;
    const set = (id, v) => { const e = $id(id); if (e && e.value !== String(v)) e.value = String(v); };
    $id('ma_enabled').checked = S.enabled;
    $id('ma_always').checked = S.alwaysVisible;
    $id('ma_expand').checked = S.expandExtras;
    $id('ma_swipe').checked = S.swipeVisible;
    set('ma_position', S.position);
    for (const k of Object.keys(RANGES)) {
        set(`ma_r_${k}`, S[k]);
        const v = $id(`ma_v_${k}`);
        if (v) v.textContent = fmt(k, S[k], RANGES[k] && k.startsWith('offset') ? 'px' : '');
    }
    for (const h of HIDEABLE) {
        const el = $id(`ma_hide_${h.id}`);
        if (el) el.checked = !!S.hide[h.id];
    }
    $id('ma_body').classList.toggle('ma-disabled', !S.enabled);
    refreshStatus();
}

function update(mut) {
    mut();
    S = sanitize(S);
    save();
    apply();
    refreshUi();
}

function bindUi() {
    const on = (id, ev, fn) => $id(id)?.addEventListener(ev, fn);
    on('ma_enabled', 'change', (e) => update(() => { S.enabled = e.target.checked; }));
    on('ma_always', 'change', (e) => update(() => { S.alwaysVisible = e.target.checked; }));
    on('ma_expand', 'change', (e) => update(() => { S.expandExtras = e.target.checked; }));
    on('ma_swipe', 'change', (e) => update(() => { S.swipeVisible = e.target.checked; }));
    on('ma_position', 'change', (e) => update(() => { S.position = e.target.value; }));
    document.querySelectorAll('#ma_settings input[type="range"]').forEach((e) => {
        e.addEventListener('input', () => update(() => { S[e.dataset.key] = Number(e.value); }));
    });
    document.querySelectorAll('#ma_settings input[data-hide]').forEach((e) => {
        e.addEventListener('change', () => update(() => { S.hide[e.dataset.hide] = e.target.checked; }));
    });
    on('ma_reset', 'click', () => {
        if (!confirm('Remettre tous les réglages d\'Actions Message par défaut ?')) return;
        update(() => { S = sanitize({ enabled: S.enabled }); });
    });
}

try {
    loadSettings();
    apply();
} catch (e) { console.warn(LOG, 'init précoce', e); }

jQuery(async () => {
    try {
        loadSettings();
        apply();
        const host = $id('extensions_settings2') || $id('extensions_settings');
        if (host && !$id('ma_settings')) {
            host.insertAdjacentHTML('beforeend', panelHtml());
            bindUi();
            refreshUi();
        }
        const c = ctx();
        c?.eventSource?.on?.(c.eventTypes?.SETTINGS_LOADED ?? 'settings_loaded', () => {
            loadSettings(); apply(); refreshUi();
        });
    } catch (e) {
        console.error(LOG, 'initialisation', e);
    }
});

window.MessageActions = Object.freeze({
    getSettings: () => JSON.parse(JSON.stringify(S)),
    set: (patch) => update(() => {
        if (!patch || typeof patch !== 'object') return;
        const { hide, ...rest } = patch;
        Object.assign(S, rest);
        if (hide && typeof hide === 'object') S.hide = { ...S.hide, ...hide };
    }),
    reset: () => update(() => { S = sanitize({}); }),
    reapply: () => apply(),
});

export const __test = { buildCss, sanitize, DEFAULTS, RANGES, POSITIONS, HIDEABLE };
