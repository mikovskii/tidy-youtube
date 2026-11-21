// ==UserScript==
// @name         Tidy for YouTube
// @namespace    tidy-youtube
// @author       mikovskii
// @version      1.8.0
// @description  Hides clutter in the YouTube interface: Shorts, shelves, extra buttons. Pure CSS, 34 toggles.
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
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
 *    - sel  — CSS selectors for the elements to hide;
 *    - mode — 'hide' (default, display:none) or 'gray' (filter:grayscale, use on <img> only).
 * 2. That's it. The default (off), the CSS rule and the panel toggle are generated.
 *    Every option is pure CSS — no JS touches the page DOM.
 *
 * One <style> element holds the rules of the ENABLED options only, so disabled options
 * cost nothing (not even :has() matching). It is rewritten only when a toggle changes.
 * No observers, no timers, no event listeners on the page.
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

  const SHORTS = {
    // The Shorts guide entry has no href, so match by title.
    nav: ['ytd-guide-entry-renderer:has(> a[title="Shorts"])',
          'ytd-mini-guide-entry-renderer:has(> a[title="Shorts"])',
          'yt-tab-shape[tab-title="Shorts"]'],
    feed: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
           'ytd-browse ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model)'],
    search: ['ytd-search grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
             'ytd-search ytd-reel-shelf-renderer',
             'ytd-search ytd-video-renderer:has(a#thumbnail[href^="/shorts/"])'],
    other: ['ytd-browse ytd-reel-shelf-renderer',
            'ytd-watch-flexy ytd-reel-shelf-renderer',
            'ytd-watch-next-secondary-results-renderer yt-lockup-view-model:has(a[href^="/shorts/"])'],
  };

  const OPTIONS = [
    // Home Page
    { key: 'hideHomeShelves', section: 'Home Page', group: 'Suggestions', label: 'Hide Breaking News, Trending and etc.',
      // The Shorts shelf (is-shorts) is handled by hideShortsFeed.
      sel: ['ytd-browse[page-subtype="home"] ytd-rich-section-renderer:has(ytd-rich-shelf-renderer:not([is-shorts]))'] },

    // Left Navigation Bar
    { key: 'grayscaleSubAvatars', section: 'Left Navigation Bar', group: 'Subscriptions Section', label: 'Grayscale Subscriptions Avatars',
      mode: 'gray',
      // Subscriptions sit directly in a section's #items; your own avatar is in the 'You' #section-items and is skipped.
      sel: ['ytd-guide-section-renderer #items > ytd-guide-entry-renderer > a img',
            'ytd-guide-collapsible-entry-renderer #expandable-items > ytd-guide-entry-renderer > a img'] },
    { key: 'hideMovies', section: 'Left Navigation Bar', group: 'Explore Section', label: "Hide 'Movies' Button",
      sel: guide('[href^="/feed/storefront"]') },
    { key: 'hideGaming', section: 'Left Navigation Bar', group: 'Explore Section', label: "Hide 'Gaming' Button",
      sel: [...guide('[href="/gaming"]'), ...guide('[href^="/channel/UCOpNcN46UbXVtpKMrmU4Abg"]')] },
    { key: 'hideNews', section: 'Left Navigation Bar', group: 'Explore Section', label: "Hide 'News' Button",
      sel: guide('[href^="/channel/UCYfdidRxbB8Qhf0Nx7ioOYw"]') },
    { key: 'hideSports', section: 'Left Navigation Bar', group: 'Explore Section', label: "Hide 'Sports' Button",
      sel: guide('[href^="/channel/UCEgdi0XIXXZ-qJOFPf4JSKw"]') },
    { key: 'hideKids', section: 'Left Navigation Bar', group: 'More from YouTube Section', label: "Hide 'Kids' Button",
      sel: guide('[href*="youtubekids.com"]') },

    // Header
    { key: 'hideVoiceSearch', section: 'Header', group: 'Search Bar', label: "Hide 'Voice Search' Button",
      sel: ['ytd-masthead #voice-search-button'] },
    { key: 'hideCreateButton', section: 'Header', group: 'Header Buttons', label: "Hide 'Create' Button",
      // 'Create' is the ytd-button-renderer right before the bell. The guest 'Sign in' button never matches.
      sel: ['ytd-masthead #buttons > ytd-button-renderer:has(+ ytd-notification-topbar-button-renderer)',
            'ytd-masthead #buttons > ytd-topbar-menu-button-renderer:has(+ ytd-notification-topbar-button-renderer)'] },

    // Video Page
    { key: 'hideWatermark', section: 'Video Page', group: 'Player', label: 'Hide Watermark',
      sel: ['#movie_player .ytp-watermark', '#movie_player .iv-branding'] },
    { key: 'hideHashtags', section: 'Video Page', group: 'Video Details', label: 'Hide Video Hashtags',
      sel: ['ytd-watch-metadata #super-title', 'ytd-watch-metadata a[href^="/hashtag/"]'] },
    { key: 'grayscaleChannelAvatar', section: 'Video Page', group: 'Video Details', label: 'Grayscale Channel Avatar',
      mode: 'gray', sel: ['ytd-watch-metadata #owner #avatar img'] },
    { key: 'hideJoinButton', section: 'Video Page', group: 'Video Details', label: "Hide 'Join' Button",
      sel: ['ytd-watch-metadata #sponsor-button'] },
    { key: 'hideDownloadButton', section: 'Video Page', group: 'Video Details', label: "Hide 'Download' Button",
      sel: ['ytd-download-button-renderer', 'ytd-menu-service-item-download-renderer'] },

    // Video Page -> Comments. Children (parent: 'hideComments') are greyed out while the whole section is hidden.
    { key: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Comments',
      sel: ['ytd-watch-flexy ytd-comments#comments', 'ytd-comments-entry-point-header-renderer'] },
    { key: 'hideCommentsCount', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Comments Count',
      sel: ['ytd-comments-header-renderer #count'] },
    { key: 'hideAddComment', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: "Hide 'Add Comment' Textfield",
      sel: ['ytd-comments-header-renderer ytd-comment-simplebox-renderer'] },
    { key: 'hideCommentsSort', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Comments Sort Button',
      sel: ['ytd-comments-header-renderer #sort-menu'] },
    { key: 'hideCommentAvatars', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Comment Avatar',
      sel: ['ytd-comment-view-model #author-thumbnail', 'ytd-comment-renderer #author-thumbnail'] },
    { key: 'grayscaleCommentAvatars', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Grayscale Comment Avatar',
      mode: 'gray', sel: ['ytd-comment-view-model #author-thumbnail img'] },
    { key: 'hideCommentTime', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Comment Published Time',
      sel: ['ytd-comment-view-model #published-time-text'] },
    { key: 'hideCommentLikeCount', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Likes Count of Comment',
      sel: ['ytd-comment-engagement-bar #vote-count-middle'] },
    { key: 'hideCommentLike', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: "Hide 'Like' Comment Button",
      sel: ['ytd-comment-engagement-bar #like-button'] },
    { key: 'hideCommentDislike', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: "Hide 'Dislike' Comment Button",
      sel: ['ytd-comment-engagement-bar #dislike-button'] },
    { key: 'hideCommentReply', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: "Hide 'Reply' Comment Button",
      sel: ['ytd-comment-engagement-bar #reply-button-end'] },
    { key: 'hideCreatorHeart', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Like from the Video Creator',
      sel: ['ytd-comment-engagement-bar #creator-heart'] },
    { key: 'hideCommentReplies', parent: 'hideComments', section: 'Video Page', group: 'Comments', label: 'Hide Comment Replies',
      sel: ['ytd-comment-thread-renderer > #replies'] },

    // Search Page
    { key: 'hideSearchShelves', section: 'Search Page', group: 'Search Results', label: 'Hide For You, Trending, etc',
      // Shorts shelves in search are grid-shelf-view-model / ytd-reel-shelf-renderer and are not matched.
      sel: ['ytd-search ytd-item-section-renderer > #contents > ytd-shelf-renderer'] },
    { key: 'hidePeopleAlsoSearch', section: 'Search Page', group: 'Search Results', label: "Hide 'People Also Search For'",
      // Direct children of the results only: the same tag is used for chapters inside video cards.
      sel: ['ytd-search ytd-item-section-renderer > #contents > ytd-horizontal-card-list-renderer'] },

    // Shorts: one master toggle, per-place options nested under it (greyed out while it is on).
    { key: 'hideShorts', section: 'Shorts', group: 'Shorts', label: 'Hide Shorts',
      sel: [...SHORTS.nav, ...SHORTS.feed, ...SHORTS.search, ...SHORTS.other] },
    { key: 'hideShortsNav', parent: 'hideShorts', section: 'Shorts', group: 'Shorts', label: "Hide 'Shorts' in Sidebar and Channel Tabs",
      sel: SHORTS.nav },
    { key: 'hideShortsFeed', parent: 'hideShorts', section: 'Shorts', group: 'Shorts', label: 'Hide Shorts on Home and Subscriptions',
      sel: SHORTS.feed },
    { key: 'hideShortsSearch', parent: 'hideShorts', section: 'Shorts', group: 'Shorts', label: 'Hide Shorts in Search',
      sel: SHORTS.search },
    { key: 'hideShortsOther', parent: 'hideShorts', section: 'Shorts', group: 'Shorts', label: 'Hide Shorts on Channel and Video Pages',
      sel: SHORTS.other },
  ];

  const STORE_KEY = 'settings';
  // Everything starts off: users opt in to what they want hidden.
  const DEFAULTS = Object.fromEntries(OPTIONS.map((o) => [o.key, false]));

  // ---------------------------------------------------------------------------
  // Settings: read once at startup. Writes touch only the changed key and merge
  // with what is stored, so tabs never overwrite each other's changes.
  // ---------------------------------------------------------------------------
  const readStored = () => {
    try { return GM_getValue(STORE_KEY, {}) || {}; } catch (_) { return {}; }
  };
  const settings = { ...DEFAULTS };
  const load = (stored) => {
    for (const k in DEFAULTS) settings[k] = typeof stored[k] === 'boolean' ? stored[k] : DEFAULTS[k];
  };
  load(readStored());

  const saveKey = (key, val) => {
    const stored = readStored();
    stored[key] = val;
    GM_setValue(STORE_KEY, stored);
  };

  // ---------------------------------------------------------------------------
  // CSS: one style element with the rules of enabled options only.
  // ---------------------------------------------------------------------------
  const style = document.createElement('style');
  style.id = 'tidy-youtube';
  const ruleOf = (o) => o.sel.join(',\n') +
    (o.mode === 'gray' ? '{filter:grayscale(1)!important}' : '{display:none!important}');
  const applyCss = () => {
    style.textContent = OPTIONS.filter((o) => settings[o.key]).map(ruleOf).join('\n');
  };
  applyCss();
  (document.head || document.documentElement).appendChild(style);

  const setOption = (key, val) => {
    if (settings[key] === val) return;
    settings[key] = val;
    applyCss();
  };

  // Changes made in another tab apply here immediately.
  if (typeof GM_addValueChangeListener === 'function') {
    GM_addValueChangeListener(STORE_KEY, (_name, _old, val, remote) => {
      if (!remote) return;
      load(val || {});
      applyCss();
      if (panel) panel.refresh();
      log('synced from another tab');
    });
  }

  // ---------------------------------------------------------------------------
  // Settings panel: built on open, fully removed on close.
  // Shadow DOM + createElement/textContent only (YouTube enforces Trusted Types).
  // ---------------------------------------------------------------------------
  const PANEL_CSS = `
    :host{all:initial}
    [hidden]{display:none!important}
    *{box-sizing:border-box}
    .bd{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px;font:14px/1.4 Roboto,-apple-system,"Segoe UI",sans-serif;color:#e8eaed}
    .pn{position:relative;width:min(440px,100%);height:min(720px,88vh);display:flex;flex-direction:column;background:#14171c;border:1px solid #2a2f37;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden}
    .hd{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 0 18px}
    .hd h1{margin:0;font-size:14px;font-weight:600;color:#9aa0a6}
    button{font:inherit;color:inherit}
    .ib{display:grid;place-items:center;width:34px;height:34px;background:none;border:0;border-radius:10px;color:#9aa0a6;cursor:pointer}
    .ib:hover{background:#252a32;color:#fff}
    .bar{display:flex;padding:10px 16px 6px}
    .dd{height:54px;background:#1d2128;border:1px solid #2a2f37;border-radius:14px;cursor:pointer;flex:1;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px;text-align:left}
    .dd:hover{background:#232830}
    .dd-t{display:flex;flex-direction:column;line-height:1.25}
    .dd-l{font-size:12px;color:#9aa0a6}
    .dd-v{font-size:16px;font-weight:700}
    .dd svg{color:#9aa0a6}
    .cap{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#80868e;padding:16px 4px 8px}
    .scroll{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:0 16px 16px}
    .sh{display:flex;align-items:center;gap:8px;width:100%;background:none;border:0;padding:20px 2px 6px;text-align:left;cursor:pointer}
    .sh h2{flex:1;margin:0;font-size:20px;font-weight:700}
    .cnt{font-size:13px;color:#9aa0a6}
    .chev{color:#9aa0a6}
    .sh[aria-expanded="false"] .chev{transform:rotate(-90deg)}
    .grp{font-size:13px;color:#9aa0a6;padding:12px 2px 6px}
    .card{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px;padding:14px 16px;background:#1d2128;border:1px solid #2a2f37;border-radius:14px;font-size:14px;font-weight:500;cursor:pointer}
    .card:hover{background:#21262e}
    .pc{margin-bottom:8px;padding:2px 10px 10px;background:#1d2128;border:1px solid #2a2f37;border-radius:16px}
    .row{display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:14px;font-weight:500;cursor:pointer}
    .pc > .row{padding:12px 6px;font-weight:600}
    .sub{padding:0 14px;background:#181c22;border:1px solid #2a2f37;border-radius:14px}
    .sub .row{padding:13px 0;border-bottom:1px solid #2a2f37}
    .sub .row:last-child{border-bottom:0}
    .row.off{opacity:.4;cursor:default}
    .tg:disabled{cursor:default}
    .tg{appearance:none;-webkit-appearance:none;flex:none;position:relative;width:46px;height:28px;margin:0;border-radius:14px;background:#3a404a;cursor:pointer}
    .tg::after{content:"";position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#cfd3d8}
    .tg:checked{background:#5b6ee1}
    .tg:checked::after{left:22px;background:#fff}
    .empty{padding:48px 0;text-align:center;color:#9aa0a6}
    .sheet{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;background:#1b1f25}
    .sheet-hd{display:flex;align-items:center;justify-content:space-between;padding:18px 12px 12px 18px}
    .sheet-hd h2{margin:0;font-size:21px;font-weight:700}
    .sw{position:relative;margin:0 16px 14px}
    .sw svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#80868e;pointer-events:none}
    .search{width:100%;height:48px;padding:0 14px 0 44px;background:#14171c;border:1px solid #2a2f37;border-radius:12px;color:#e8eaed;font:inherit;font-size:15px;outline:none}
    .search:focus{border-color:#5b6ee1}
    .sheet-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:0 16px 16px;border-top:1px solid #2a2f37}
    .nav{display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;border-bottom:1px solid #262b33;padding:14px 8px;font-size:15px;font-weight:600;text-align:left;cursor:pointer}
    .nav.qa{border-bottom:0;border-radius:10px}
    .nav:hover,.nav.on{background:#252a32;border-radius:10px}
    .nav svg{color:#9aa0a6}
    .nav-l{flex:1}
    .nav-c{font-size:13px;font-weight:500;color:#9aa0a6}
    button:focus-visible,.tg:focus-visible{outline:2px solid #8fa0ff;outline-offset:2px}
  `;

  // Stroke icons (24x24), built with createElementNS.
  const ICONS = {
    close: 'M6 6l12 12M18 6L6 18',
    chev: 'M6 9l6 6 6-6',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13zM20 20l-4.8-4.8',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  };
  const icon = (name, size = 20) => {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', size], ['height', size], ['fill', 'none'],
      ['stroke', 'currentColor'], ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'],
      ['aria-hidden', 'true']]) s.setAttribute(k, v);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', ICONS[name]);
    s.appendChild(p);
    return s;
  };

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
    const inSection = (sec) => OPTIONS.filter((o) => o.section === sec);
    const countOn = (opts) => opts.filter((o) => settings[o.key]).length;

    let view = 'all';                // 'all' | 'enabled' | <section name>
    const collapsed = new Set();     // collapsed sections
    const inputs = new Map();        // key -> Set<input> (main list + search results)
    const counters = new Map();      // section -> "N enabled" span

    const refreshCounts = () => {
      for (const [sec, span] of counters) span.textContent = `${countOn(inSection(sec))} enabled`;
    };

    const isLocked = (o) => !!(o.parent && settings[o.parent]);
    const syncLocks = () => {
      for (const o of OPTIONS) {
        if (!o.parent || !inputs.has(o.key)) continue;
        const locked = isLocked(o);
        for (const i of inputs.get(o.key)) {
          i.disabled = locked;
          i.parentNode.classList.toggle('off', locked);
        }
      }
    };

    const toggleRow = (o, cls = 'card') => {
      const inp = el('input', {
        type: 'checkbox', role: 'switch', class: 'tg', 'aria-label': o.label,
        onchange: (e) => {
          const v = e.target.checked;
          setOption(o.key, v);
          saveKey(o.key, v);
          for (const i of inputs.get(o.key)) i.checked = v;
          refreshCounts();
          syncLocks();
        },
      });
      inp.checked = settings[o.key];
      inp.disabled = isLocked(o);
      if (!inputs.has(o.key)) inputs.set(o.key, new Set());
      inputs.get(o.key).add(inp);
      return el('label', { class: cls + (inp.disabled ? ' off' : '') }, [el('span', { text: o.label }), inp]);
    };

    // --- Main list -----------------------------------------------------------
    const browseValue = el('span', { class: 'dd-v' });
    const list = el('div', { class: 'scroll' });

    const renderList = () => {
      inputs.clear();
      counters.clear();
      list.replaceChildren();
      const secs = view === 'all' || view === 'enabled' ? sections : [view];
      for (const sec of secs) {
        const opts = inSection(sec).filter((o) => view !== 'enabled' || settings[o.key]);
        if (!opts.length) continue;
        const body = el('div');
        const cnt = el('span', { class: 'cnt' });
        const chev = icon('chev', 18);
        chev.setAttribute('class', 'chev');
        counters.set(sec, cnt);
        const head = el('button', {
          class: 'sh', type: 'button', 'aria-expanded': String(!collapsed.has(sec)),
          onclick: () => {
            const c = !collapsed.has(sec);
            if (c) collapsed.add(sec); else collapsed.delete(sec);
            body.hidden = c;
            head.setAttribute('aria-expanded', String(!c));
          },
        }, [el('h2', { text: sec }), cnt, chev]);
        body.hidden = collapsed.has(sec);
        let group = null;
        const shown = new Set(opts.map((o) => o.key));
        // Group labels only help when a section has several groups and at least one holds more than one option.
        const groupSizes = new Map();
        for (const o of opts) groupSizes.set(o.group, (groupSizes.get(o.group) || 0) + 1);
        const showGroups = groupSizes.size > 1 && [...groupSizes.values()].some((n) => n > 1);
        for (const o of opts) {
          if (o.parent && shown.has(o.parent)) continue; // rendered inside its parent card
          if (o.group !== group) {
            if (showGroups) body.appendChild(el('div', { class: 'grp', text: o.group }));
            group = o.group;
          }
          const kids = opts.filter((c) => c.parent === o.key);
          if (!kids.length) { body.appendChild(toggleRow(o)); continue; }
          body.appendChild(el('div', { class: 'pc' }, [
            toggleRow(o, 'row'),
            el('div', { class: 'sub' }, kids.map((c) => toggleRow(c, 'row'))),
          ]));
        }
        list.append(head, body);
      }
      if (!list.firstChild) list.appendChild(el('p', { class: 'empty', text: 'No options enabled.' }));
      browseValue.textContent = view === 'all' ? 'All features' : view === 'enabled' ? 'Enabled' : view;
      list.scrollTop = 0;
      refreshCounts();
    };


    // --- Browse sheet --------------------------------------------------------
    const sheetBody = el('div', { class: 'sheet-body' });
    const search = el('input', {
      type: 'search', class: 'search', placeholder: 'Search features…', 'aria-label': 'Search features',
      oninput: () => renderSheet(),
    });
    const navItem = (ico, label, count, target, cls) => el('button', {
      class: `nav${cls ? ' ' + cls : ''}${view === target ? ' on' : ''}`, type: 'button',
      onclick: () => { view = target; closeSheet(); },
    }, [ico && icon(ico), el('span', { class: 'nav-l', text: label }), el('span', { class: 'nav-c', text: count })]);

    const renderSheet = () => {
      sheetBody.replaceChildren();
      const q = search.value.trim().toLowerCase();
      if (q) {
        const hits = OPTIONS.filter((o) => `${o.label} ${o.section} ${o.group}`.toLowerCase().includes(q));
        sheetBody.appendChild(el('div', { class: 'cap', text: `${hits.length} result${hits.length === 1 ? '' : 's'}` }));
        for (const o of hits) sheetBody.appendChild(toggleRow(o));
        return;
      }
      const on = countOn(OPTIONS);
      sheetBody.append(
        el('div', { class: 'cap', text: 'Quick access' }),
        navItem('grid', 'All features', `${on} / ${OPTIONS.length}`, 'all', 'qa'),
        navItem('sliders', 'Enabled', String(on), 'enabled', 'qa'),
        el('div', { class: 'cap', text: 'Sections' }),
        ...sections.map((s) => {
          const opts = inSection(s);
          return navItem(null, s, `${countOn(opts)} / ${opts.length}`, s);
        }),
      );
    };

    const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Browse features', hidden: '' }, [
      el('div', { class: 'sheet-hd' }, [
        el('h2', { text: 'Browse Features' }),
        el('button', { class: 'ib', type: 'button', 'aria-label': 'Close', onclick: () => closeSheet() }, [icon('close')]),
      ]),
      el('div', { class: 'sw' }, [icon('search', 18), search]),
      sheetBody,
    ]);
    const openSheet = () => {
      search.value = '';
      renderSheet();
      sheet.hidden = false;
      search.focus({ preventScroll: true });
    };
    const closeSheet = () => {
      sheet.hidden = true;
      sheetBody.replaceChildren();
      renderList(); // also drops search-result inputs from the map
      browseBtn.focus({ preventScroll: true });
    };

    // --- Shell ---------------------------------------------------------------
    const browseBtn = el('button', {
      class: 'dd', type: 'button', 'aria-haspopup': 'dialog', onclick: openSheet,
    }, [el('span', { class: 'dd-t' }, [el('span', { class: 'dd-l', text: 'Browse' }), browseValue]), icon('chev')]);

    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      host.remove();
      panel = null;
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      if (!sheet.hidden) closeSheet();
      else close();
    };

    const pn = el('div', {
      class: 'pn', role: 'dialog', 'aria-label': 'Tidy for YouTube',
    }, [
      el('div', { class: 'hd' }, [
        el('h1', { text: 'Tidy for YouTube' }),
        el('button', { class: 'ib', type: 'button', 'aria-label': 'Close', onclick: close }, [icon('close')]),
      ]),
      el('div', { class: 'bar' }, [browseBtn]),
      list,
      sheet,
    ]);
    const bd = el('div', { class: 'bd', onclick: (e) => { if (e.target === bd) close(); } }, [pn]);
    shadow.appendChild(bd);
    renderList();

    // Keep key presses away from YouTube hotkeys (Space would pause, letters would seek, etc.).
    for (const t of ['keydown', 'keyup', 'keypress']) {
      host.addEventListener(t, (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
    }
    document.addEventListener('keydown', onKey, true);

    (document.body || document.documentElement).appendChild(host);
    panel = { host, close, refresh: renderList };
    browseBtn.focus({ preventScroll: true });
  };

  GM_registerMenuCommand('Tidy for YouTube settings', () => (panel ? panel.close() : openPanel()));
  log('init done', settings);
})();
