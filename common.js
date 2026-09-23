const STORAGE_KEY = "guitar-tabs";

function loadTabs() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveTabs(tabs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  updateNavCount();
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Site-specific parsers: given a URL object, return {song, artist} or null.
const siteParsers = [
  {
    test: (url) => url.hostname.endsWith("negina.co.il"),
    parse: (url) => {
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("chords");
      if (idx === -1 || parts.length < idx + 3) return null;
      const clean = (s) => decodeURIComponent(s).replace(/-/g, " ").trim();
      const artist = clean(parts[idx + 1]);
      const song = clean(parts[idx + 2]);
      return artist && song ? { song, artist } : null;
    },
  },
];

function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return value.includes(".") ? "https://" + value : value;
}

function parseHttpUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function canonicalUrl(raw) {
  const url = parseHttpUrl(raw);
  return url ? url.href : "";
}

// Show percent-encoded (e.g. Hebrew) URLs in readable form.
function prettyUrl(raw) {
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

function autoDetect(rawUrl) {
  const url = parseHttpUrl(rawUrl);
  if (!url) return null;
  const parser = siteParsers.find((p) => p.test(url));
  try {
    return parser ? parser.parse(url) : null;
  } catch {
    return null;
  }
}

function sourceLabel(rawUrl) {
  const url = parseHttpUrl(rawUrl);
  return url ? url.hostname.replace(/^www\./, "") : "";
}

function countLabel(n, one, many) {
  return n === 1 ? one : `${n} ${many}`;
}

const ICONS = {
  pick: '<path d="M12 21.5c-2.6-2.3-7.5-8-7.5-12.7C4.5 5 7.8 2.5 12 2.5s7.5 2.5 7.5 6.3c0 4.7-4.9 10.4-7.5 12.7z" fill="currentColor" stroke="none"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  star: '<path d="M12 2.5 15 9l7 1-5.2 5 1.3 7L12 18.5 5.9 22l1.3-7L2 10l7-1z"/>',
  shuffle: '<path d="m18 4 3 3-3 3"/><path d="M2 7h4.5a3 3 0 0 1 2.4 1.2L15 17a3 3 0 0 0 2.4 1.2H21"/><path d="m18 20 3-3-3-3"/><path d="M2 17h4.5a3 3 0 0 0 2.4-1.2L11 12"/>',
};

function svgIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function icon(name) {
  const span = document.createElement("span");
  span.className = "icon";
  span.innerHTML = svgIcon(name);
  return span;
}

// Tiny DOM builder. Strings become text nodes, so user data is never parsed as HTML.
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

function artistHue(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return hash % 360;
}

function avatar(artist, size = "") {
  const letter = (artist || "?").trim().charAt(0) || "?";
  return h(
    "span",
    { class: `avatar ${size}`.trim(), style: `--hue:${artistHue(artist || "")}`, "aria-hidden": "true" },
    letter
  );
}

function highlight(text, query) {
  const frag = document.createDocumentFragment();
  if (!query) {
    frag.append(text);
    return frag;
  }
  const lower = text.toLowerCase();
  let i = 0;
  let idx;
  while ((idx = lower.indexOf(query, i)) !== -1) {
    frag.append(text.slice(i, idx), h("mark", {}, text.slice(idx, idx + query.length)));
    i = idx + query.length;
  }
  frag.append(text.slice(i));
  return frag;
}

function tabCard(tab, opts = {}) {
  const { query = "", compact = false, preview = false, onArtist, onEdit, onDelete, onToggleFavorite } = opts;
  const href = parseHttpUrl(tab.link) ? tab.link : null;
  const card = h(preview ? "div" : "li", {
    class: ["tab-card", compact && "compact", preview && "is-preview"].filter(Boolean).join(" "),
  });

  if (!compact) card.append(avatar(tab.artist));

  const title =
    preview || !href
      ? h("span", { class: "tab-song" }, highlight(tab.song, query))
      : h("a", { class: "tab-song", href, target: "_blank", rel: "noopener noreferrer" }, highlight(tab.song, query));

  const meta = h("div", { class: "tab-meta" });
  if (!compact) {
    meta.append(
      onArtist
        ? h(
            "button",
            { type: "button", class: "artist-link", title: `כל הטאבים של ${tab.artist}`, onclick: () => onArtist(tab.artist) },
            highlight(tab.artist, query)
          )
        : h("span", { class: "tab-artist" }, highlight(tab.artist, query))
    );
  }
  if (tab.source) meta.append(h("span", { class: "tab-source" }, icon("globe"), h("bdi", {}, tab.source)));

  card.append(h("div", { class: "tab-main" }, title, meta));

  if (!preview) {
    card.append(
      h(
        "div",
        { class: "tab-actions" },
        href &&
          h(
            "a",
            { class: "icon-btn", href, target: "_blank", rel: "noopener noreferrer", title: "פתיחת הטאב", "aria-label": `פתיחת ${tab.song}` },
            icon("external")
          ),
        onToggleFavorite &&
          h(
            "button",
            {
              type: "button",
              class: `icon-btn favorite-btn${tab.favorite ? " active" : ""}`,
              title: tab.favorite ? "הסרה ממועדפים" : "הוספה למועדפים",
              "aria-label": tab.favorite ? `הסרת ${tab.song} ממועדפים` : `הוספת ${tab.song} למועדפים`,
              "aria-pressed": String(!!tab.favorite),
              onclick: onToggleFavorite,
            },
            icon("star")
          ),
        onEdit &&
          h("button", { type: "button", class: "icon-btn", title: "עריכה", "aria-label": `עריכת ${tab.song}`, onclick: onEdit }, icon("edit")),
        onDelete &&
          h(
            "button",
            { type: "button", class: "icon-btn danger", title: "מחיקה", "aria-label": `מחיקת ${tab.song}`, onclick: onDelete },
            icon("trash")
          )
      )
    );
  }
  return card;
}

let toastTimer;
function showToast(message, { type = "info", actionLabel, onAction, duration = 4000 } = {}) {
  let el = document.getElementById("toast");
  if (!el) {
    el = h("div", { id: "toast", class: "toast", role: "status", "aria-live": "polite" });
    document.body.append(el);
  }
  const hide = () => el.classList.remove("show");
  const iconName = type === "success" ? "check" : type === "error" ? "alert" : "info";
  el.replaceChildren(
    h("span", { class: `toast-icon ${type}` }, icon(iconName)),
    h("span", { class: "toast-text" }, message),
    actionLabel &&
      h(
        "button",
        {
          type: "button",
          class: "toast-action",
          onclick: () => {
            hide();
            onAction();
          },
        },
        actionLabel
      )
  );
  // Force reflow so re-showing restarts the transition.
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, duration);
}

function updateNavCount() {
  const n = loadTabs().length;
  document.querySelectorAll("[data-nav-count]").forEach((el) => {
    el.textContent = n;
    el.hidden = n === 0;
  });
}

document.querySelectorAll("[data-icon]").forEach((el) => {
  el.innerHTML = svgIcon(el.dataset.icon);
});
updateNavCount();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Tabs/sw.js').catch(() => {
    // Service worker registration failed - app still works
  });
}
