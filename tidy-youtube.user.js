// ==UserScript==
// @name         Tidy for YouTube
// @namespace    tidy-youtube
// @author       mikovskii
// @version      1.2.1
// @description  Hides clutter in the YouTube interface: Shorts, shelves, extra buttons. Pure CSS, 21 toggles.
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @noframes
// @homepageURL  https://github.com/mikovskii/tidy-youtube
// @supportURL   https://github.com/mikovskii/tidy-youtube/issues
// @updateURL    https://raw.githubusercontent.com/mikovskii/tidy-youtube/main/tidy-youtube.user.js
// @downloadURL  https://raw.githubusercontent.com/mikovskii/tidy-youtube/main/tidy-youtube.user.js
// ==/UserScript==

/*
 * HOW TO ADD A NEW OPTION
 * 1. Add an object to the OPTIONS array below:
 *      { key: 'hideFoo', section: 'Video Page', group: 'Actions',
 *        label: "Hide 'Foo'", sel: ['ytd-foo-renderer'] }
 *    - sel  — CSS selectors (each gets the html[data-tidy-hide-foo] prefix automatically);
 *    - mode — 'hide' (default, display:none) or 'gray' (filter:grayscale, use on <img> only).
 * 2. That's it. The default (true), the <html> attribute, the CSS rule and the panel
 *    toggle are all generated. Every option is pure CSS — no JS touches the page DOM.
 *
 * All rules live in ONE <style> element, injected once at document-start.
 * Toggling an option only adds/removes an attribute on <html>. No DOM traversal.
 */

(() => {
  'use strict';

  const DEBUG = false;
  const log = DEBUG ? (...a) => console.log('[Tidy]', ...a) : () => {};

  // ---------------------------------------------------------------------------
  // Config: every selector lives here. Verified against live YouTube (Nov 2026).
  // ---------------------------------------------------------------------------
  const guide = (href) => [
    `ytd-guide-entry-renderer:has(> a${href})`,
    `ytd-mini-guide-entry-renderer:has(> a${href})`,
  ];

  const OPTIONS = [
    // Header
    { key: 'hideVoiceSearch', section: 'Header', group: 'Search', label: "Hide 'Voice Search' Button",
      sel: ['ytd-masthead #voice-search-button'] },
    { key: 'hideCreateButton', section: 'Header', group: 'Buttons', label: "Hide 'Create' Button",
      // 'Create' is the ytd-button-renderer right before the bell. The guest 'Sign in' button never matches.
      sel: ['ytd-masthead #buttons > ytd-button-renderer:has(+ ytd-notification-topbar-button-renderer)',
            'ytd-masthead #buttons > ytd-topbar-menu-button-renderer:has(+ ytd-notification-topbar-button-renderer)'] },

    // Home Page
    { key: 'hideHomeShelves', section: 'Home Page', group: 'Feed', label: 'Hide Breaking News, Trending and etc.',
      // The Shorts shelf (is-shorts) is handled by hideShortsFeed.
      sel: ['ytd-browse[page-subtype="home"] ytd-rich-section-renderer:has(ytd-rich-shelf-renderer:not([is-shorts]))'] },

    // Left Navigation Bar
    { key: 'hideKids', section: 'Left Navigation Bar', group: 'More from YouTube', label: "Hide 'Kids' Button",
      sel: guide('[href*="youtubekids.com"]') },
    { key: 'grayscaleSubAvatars', section: 'Left Navigation Bar', group: 'Subscriptions', label: 'Grayscale Subscriptions Avatars',
      mode: 'gray',
      // Subscriptions sit directly in a section's #items; your own avatar is in the 'You' #section-items and is skipped.
      sel: ['ytd-guide-section-renderer #items > ytd-guide-entry-renderer > a img',
            'ytd-guide-collapsible-entry-renderer #expandable-items > ytd-guide-entry-renderer > a img'] },
    { key: 'hideMovies', section: 'Left Navigation Bar', group: 'Explore', label: "Hide 'Movies' Button",
      sel: guide('[href^="/feed/storefront"]') },
    { key: 'hideGaming', section: 'Left Navigation Bar', group: 'Explore', label: "Hide 'Gaming' Button",
      sel: [...guide('[href="/gaming"]'), ...guide('[href^="/channel/UCOpNcN46UbXVtpKMrmU4Abg"]')] },
    { key: 'hideNews', section: 'Left Navigation Bar', group: 'Explore', label: "Hide 'News' Button",
      sel: guide('[href^="/channel/UCYfdidRxbB8Qhf0Nx7ioOYw"]') },
    { key: 'hideSports', section: 'Left Navigation Bar', group: 'Explore', label: "Hide 'Sports' Button",
      sel: guide('[href^="/channel/UCEgdi0XIXXZ-qJOFPf4JSKw"]') },

    // Video Page
    { key: 'hideWatermark', section: 'Video Page', group: 'Player', label: 'Hide Watermark',
      sel: ['#movie_player .ytp-watermark', '#movie_player .iv-branding'] },
    { key: 'grayscaleChannelAvatar', section: 'Video Page', group: 'Channel', label: 'Grayscale Channel Avatar',
      mode: 'gray', sel: ['ytd-watch-metadata #owner #avatar img'] },
    { key: 'hideHashtags', section: 'Video Page', group: 'Description', label: 'Hide Video Hashtags',
      sel: ['ytd-watch-metadata #super-title', 'ytd-watch-metadata a[href^="/hashtag/"]'] },
    { key: 'hideJoinButton', section: 'Video Page', group: 'Channel', label: "Hide 'Join' Button",
      sel: ['ytd-watch-metadata #sponsor-button'] },
    { key: 'hideDownloadButton', section: 'Video Page', group: 'Actions', label: "Hide 'Download' Button",
      sel: ['ytd-download-button-renderer', 'ytd-menu-service-item-download-renderer'] },
    { key: 'hideCommentAvatars', section: 'Video Page', group: 'Comments', label: 'Hide Comment Avatar',
      sel: ['ytd-comment-view-model #author-thumbnail', 'ytd-comment-renderer #author-thumbnail'] },

    // Search Page
    { key: 'hideSearchShelves', section: 'Search Page', group: 'Results', label: 'Hide For You, Trending, etc',
      // Shorts shelves in search are grid-shelf-view-model / ytd-reel-shelf-renderer and are not matched.
      sel: ['ytd-search ytd-item-section-renderer > #contents > ytd-shelf-renderer'] },
    { key: 'hidePeopleAlsoSearch', section: 'Search Page', group: 'Results', label: "Hide 'People Also Search For'",
      // Direct children of the results only: the same tag is used for chapters inside video cards.
      sel: ['ytd-search ytd-item-section-renderer > #contents > ytd-horizontal-card-list-renderer'] },

    // Shorts
    { key: 'hideShortsNav', section: 'Shorts', group: 'Navigation', label: "Hide 'Shorts' in Sidebar and Channel Tabs",
      // The Shorts guide entry has no href, so match by title.
      sel: ['ytd-guide-entry-renderer:has(> a[title="Shorts"])',
            'ytd-mini-guide-entry-renderer:has(> a[title="Shorts"])',
            'yt-tab-shape[tab-title="Shorts"]'] },
    { key: 'hideShortsFeed', section: 'Shorts', group: 'Feeds', label: 'Hide Shorts on Home and Subscriptions',
      sel: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
            'ytd-browse ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model)'] },
    { key: 'hideShortsSearch', section: 'Shorts', group: 'Feeds', label: 'Hide Shorts in Search',
      sel: ['ytd-search grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
            'ytd-search ytd-reel-shelf-renderer',
            'ytd-search ytd-video-renderer:has(a#thumbnail[href^="/shorts/"])'] },
    { key: 'hideShortsOther', section: 'Shorts', group: 'Feeds', label: 'Hide Shorts on Channel and Video Pages',
      sel: ['ytd-browse ytd-reel-shelf-renderer',
            'ytd-watch-flexy ytd-reel-shelf-renderer',
            'ytd-watch-next-secondary-results-renderer yt-lockup-view-model:has(a[href^="/shorts/"])'] },
  ];

  const STORE_KEY = 'settings';
  const root = document.documentElement;
  const attrOf = (key) => 'data-tidy-' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const DEFAULTS = Object.fromEntries(OPTIONS.map((o) => [o.key, true]));

  // ---------------------------------------------------------------------------
  // Settings: read once at startup, written only when an option changes.
  // ---------------------------------------------------------------------------
  const settings = (() => {
    let saved = {};
    try { saved = GM_getValue(STORE_KEY, {}) || {}; } catch (_) { /* ignore */ }
    const s = { ...DEFAULTS };
    for (const k in DEFAULTS) if (typeof saved[k] === 'boolean') s[k] = saved[k];
    return s;
  })();
  const save = () => GM_setValue(STORE_KEY, { ...settings });

  // ---------------------------------------------------------------------------
  // CSS: a single style block for the lifetime of the page.
  // ---------------------------------------------------------------------------
  const css = OPTIONS.map((o) => {
    const pre = `html[${attrOf(o.key)}] `;
    const body = o.mode === 'gray' ? 'filter:grayscale(1)!important' : 'display:none!important';
    return o.sel.map((s) => pre + s).join(',\n') + `{${body}}`;
  }).join('\n');

  if (typeof GM_addStyle === 'function') {
    GM_addStyle(css);
  } else {
    const st = document.createElement('style');
    st.textContent = css;
    (document.head || root).appendChild(st);
  }

  // ---------------------------------------------------------------------------
  // Page type -> data-tidy-page on <html>.
  // ---------------------------------------------------------------------------
  const pageType = () => {
    const p = location.pathname;
    if (p === '/') return 'home';
    if (p === '/watch') return 'watch';
    if (p === '/results') return 'search';
    if (p.startsWith('/shorts/')) return 'shorts';
    return 'other';
  };

  const setOption = (key, val) => {
    if (settings[key] === val) return;
    settings[key] = val;
    root.toggleAttribute(attrOf(key), val);
  };

  root.setAttribute('data-tidy-page', pageType());
  for (const o of OPTIONS) root.toggleAttribute(attrOf(o.key), settings[o.key]);

  document.addEventListener('yt-navigate-finish', () => {
    root.setAttribute('data-tidy-page', pageType());
  }, { passive: true });

  // ---------------------------------------------------------------------------
  // Settings panel: built on open, fully removed on close.
  // Shadow DOM + createElement/textContent (Trusted Types).
  // ---------------------------------------------------------------------------
  const PANEL_CSS = `
    :host{all:initial}
    .bd{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px;font:14px/1.4 Roboto,-apple-system,"Segoe UI",sans-serif;color:#e8eaed}
    .pn{width:min(440px,100%);max-height:88vh;display:flex;flex-direction:column;background:#1b1f25;border:1px solid #2a2f37;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden}
    .hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #2a2f37}
    .hd h1{font-size:16px;margin:0;font-weight:600}
    .x{background:none;border:0;color:#9aa0a6;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px}
    .x:hover{background:#2a2f37;color:#fff}
    .tb{display:flex;gap:6px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid #2a2f37}
    .tb button{background:#2a2f37;color:#e8eaed;border:0;border-radius:8px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer}
    .tb button:hover{background:#353b45}
    .bdy{overflow-y:auto;padding:6px 0 10px}
    .sh{display:flex;width:100%;align-items:center;gap:8px;background:none;border:0;color:inherit;font:inherit;font-weight:600;padding:10px 16px;cursor:pointer;text-align:left}
    .sh:hover{background:#21262d}
    .sh .n{margin-left:auto;font-weight:400;font-size:12px;color:#9aa0a6}
    .sh .c{color:#9aa0a6;font-size:11px;width:10px}
    .grp{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9aa0a6;padding:8px 16px 2px 34px}
    label{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 16px 7px 34px;cursor:pointer}
    label:hover{background:#21262d}
    input{appearance:none;-webkit-appearance:none;flex:none;width:34px;height:20px;border-radius:10px;background:#3a404a;position:relative;cursor:pointer;margin:0}
    input::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#cfd3d8}
    input:checked{background:#5b6ee1}
    input:checked::after{left:17px;background:#fff}
    input:focus-visible{outline:2px solid #8fa0ff;outline-offset:2px}
  `;

  let panel = null; // { host, close }

  const el = (tag, props, kids) => {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'text') n.textContent = props[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    }
    if (kids) for (const c of kids) if (c) n.appendChild(c);
    return n;
  };

  const openPanel = () => {
    if (panel) return;
    const host = el('div', { id: 'tidy-panel-host' });
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.appendChild(el('style', { text: PANEL_CSS }));

    const sections = [...new Set(OPTIONS.map((o) => o.section))];
    const inputs = new Map();      // key -> input
    const counters = new Map();    // section -> span
    const collapsed = new Set();

    const updateCount = (sec) => {
      const opts = OPTIONS.filter((o) => o.section === sec);
      counters.get(sec).textContent = `${opts.filter((o) => settings[o.key]).length}/${opts.length} enabled`;
    };
    const setAndSync = (key, val) => {
      setOption(key, val);
      inputs.get(key).checked = val;
    };
    const bulk = (fn) => {
      for (const o of OPTIONS) setAndSync(o.key, fn(o));
      save();
      sections.forEach(updateCount);
    };

    const body = el('div', { class: 'bdy' });
    for (const sec of sections) {
      const list = el('div');
      const chev = el('span', { class: 'c', text: '▾' });
      const cnt = el('span', { class: 'n' });
      counters.set(sec, cnt);
      body.appendChild(el('button', {
        class: 'sh', type: 'button',
        onclick: () => {
          const c = !collapsed.has(sec);
          if (c) collapsed.add(sec); else collapsed.delete(sec);
          list.hidden = c;
          chev.textContent = c ? '▸' : '▾';
        },
      }, [chev, el('span', { text: sec }), cnt]));

      let lastGroup = null;
      for (const o of OPTIONS) {
        if (o.section !== sec) continue;
        if (o.group !== lastGroup) {
          list.appendChild(el('div', { class: 'grp', text: o.group }));
          lastGroup = o.group;
        }
        const inp = el('input', {
          type: 'checkbox', role: 'switch',
          onchange: (e) => { setOption(o.key, e.target.checked); save(); updateCount(sec); },
        });
        inp.checked = settings[o.key];
        inputs.set(o.key, inp);
        list.appendChild(el('label', null, [el('span', { text: o.label }), inp]));
      }
      body.appendChild(list);
      updateCount(sec);
    }

    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      host.remove();
      panel = null;
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
    };

    const pn = el('div', { class: 'pn', role: 'dialog', 'aria-label': 'Tidy for YouTube' }, [
      el('div', { class: 'hd' }, [
        el('h1', { text: 'Tidy for YouTube' }),
        el('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '✕', onclick: close }),
      ]),
      el('div', { class: 'tb' }, [
        el('button', { type: 'button', text: 'Enable all', onclick: () => bulk(() => true) }),
        el('button', { type: 'button', text: 'Disable all', onclick: () => bulk(() => false) }),
        el('button', { type: 'button', text: 'Reset to defaults', onclick: () => bulk((o) => DEFAULTS[o.key]) }),
      ]),
      body,
    ]);
    const bd = el('div', { class: 'bd', onclick: (e) => { if (e.target === bd) close(); } }, [pn]);
    shadow.appendChild(bd);

    // Keep key presses away from YouTube (otherwise Space on a toggle would pause the video).
    host.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
    document.addEventListener('keydown', onKey, true);

    (document.body || root).appendChild(host);
    panel = { host, close };
    const first = shadow.querySelector('input');
    if (first) first.focus({ preventScroll: true });
  };

  GM_registerMenuCommand('Tidy for YouTube settings', () => (panel ? panel.close() : openPanel()));
  log('init done', settings);
})();
