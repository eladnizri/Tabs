const PREFS_KEY = "guitar-tabs-prefs";

const statsEl = document.getElementById("stats");
const toolbar = document.getElementById("toolbar");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const viewButtons = document.querySelectorAll("[data-view]");
const filterBar = document.getElementById("filter-bar");
const results = document.getElementById("results");

const collator = new Intl.Collator("he", { sensitivity: "base", numeric: true });

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sort: state.sort, view: state.view }));
  } catch {}
}

const prefs = loadPrefs();
const state = {
  query: "",
  sort: prefs.sort || "newest",
  view: prefs.view || "list",
  artist: new URLSearchParams(location.search).get("artist") || "",
  editingId: null,
};

function setArtist(name) {
  state.artist = name;
  const url = new URL(location.href);
  if (name) url.searchParams.set("artist", name);
  else url.searchParams.delete("artist");
  history.replaceState(null, "", url);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function sortTabs(list) {
  const byDate = (a, b) => (a.addedAt || "").localeCompare(b.addedAt || "");
  const arr = [...list];
  switch (state.sort) {
    case "oldest":
      return arr.sort(byDate);
    case "song":
      return arr.sort((a, b) => collator.compare(a.song, b.song));
    case "artist":
      return arr.sort((a, b) => collator.compare(a.artist, b.artist) || collator.compare(a.song, b.song));
    default:
      return arr.sort((a, b) => byDate(b, a));
  }
}

function deleteTab(tab) {
  const tabs = loadTabs();
  const idx = tabs.findIndex((t) => t.id === tab.id);
  if (idx === -1) return;
  const [removed] = tabs.splice(idx, 1);
  saveTabs(tabs);
  render();
  showToast(`"${removed.song}" נמחק`, {
    actionLabel: "ביטול",
    duration: 6000,
    onAction: () => {
      const current = loadTabs();
      current.splice(Math.min(idx, current.length), 0, removed);
      saveTabs(current);
      render();
    },
  });
}

function startEdit(tab) {
  state.editingId = tab.id;
  render();
  const input = results.querySelector(".editing input");
  if (input) input.focus();
}

function editCard(tab) {
  const songIn = h("input", { type: "text", value: tab.song, "aria-label": "שם השיר" });
  const artistIn = h("input", { type: "text", value: tab.artist, "aria-label": "אמן" });
  const linkIn = h("input", { type: "text", value: prettyUrl(tab.link), dir: "ltr", inputmode: "url", "aria-label": "קישור", spellcheck: "false" });
  const error = h("p", { class: "form-error", role: "alert", hidden: true });

  const cancel = () => {
    state.editingId = null;
    render();
  };

  const fail = (msg, field) => {
    error.replaceChildren(icon("alert"), h("span", {}, msg));
    error.hidden = false;
    field.classList.add("invalid");
    field.focus();
  };

  const form = h(
    "form",
    {
      class: "edit-form",
      novalidate: true,
      onsubmit: (e) => {
        e.preventDefault();
        [songIn, artistIn, linkIn].forEach((el) => el.classList.remove("invalid"));
        const song = songIn.value.trim();
        const artist = artistIn.value.trim();
        const link = canonicalUrl(normalizeUrl(linkIn.value));
        if (!song) return fail("חסר שם שיר.", songIn);
        if (!artist) return fail("חסר שם אמן.", artistIn);
        if (!link) return fail("הקישור לא תקין.", linkIn);

        const tabs = loadTabs();
        if (tabs.some((t) => canonicalUrl(t.link) === link && t.id !== tab.id)) return fail("הקישור הזה כבר שמור בטאב אחר.", linkIn);
        const target = tabs.find((t) => t.id === tab.id);
        if (!target) return cancel();
        Object.assign(target, { song, artist, link, source: sourceLabel(link) });
        saveTabs(tabs);
        state.editingId = null;
        render();
        showToast("השינויים נשמרו", { type: "success" });
      },
      onkeydown: (e) => {
        if (e.key === "Escape") cancel();
      },
    },
    h(
      "div",
      { class: "edit-grid" },
      h("label", { class: "field" }, h("span", {}, "שם השיר"), songIn),
      h("label", { class: "field" }, h("span", {}, "אמן"), artistIn),
      h("label", { class: "field edit-link" }, h("span", {}, "קישור"), linkIn)
    ),
    error,
    h(
      "div",
      { class: "edit-actions" },
      h("button", { type: "submit", class: "btn btn-primary btn-sm" }, icon("check"), "שמירה"),
      h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: cancel }, "ביטול")
    )
  );

  return h("li", { class: "tab-card editing" }, form);
}

function cardFor(tab, query, compact) {
  if (state.editingId === tab.id) return editCard(tab);
  return tabCard(tab, {
    query,
    compact,
    onArtist: setArtist,
    onEdit: () => startEdit(tab),
    onDelete: () => deleteTab(tab),
  });
}

function emptyState() {
  return h(
    "div",
    { class: "empty-state" },
    h("div", { class: "empty-icon" }, icon("music")),
    h("h2", {}, "הספרייה עדיין ריקה"),
    h("p", {}, "הוסף קישור לדף טאבים, והוא יחכה לך כאן מסודר לפי שיר ואמן."),
    h("a", { class: "btn btn-primary", href: "index.html" }, icon("plus"), "הוספת הטאב הראשון")
  );
}

function noResults() {
  return h(
    "div",
    { class: "empty-state" },
    h("div", { class: "empty-icon" }, icon("search")),
    h("h2", {}, "לא נמצאו טאבים"),
    h("p", {}, state.query ? `אין שיר או אמן שמתאימים ל-"${state.query}".` : "אין טאבים שמתאימים לסינון."),
    h(
      "button",
      {
        type: "button",
        class: "btn btn-ghost",
        onclick: () => {
          searchInput.value = state.query = "";
          setArtist("");
          searchInput.focus();
        },
      },
      "ניקוי החיפוש"
    )
  );
}

function renderFilterBar() {
  if (!state.artist) {
    filterBar.hidden = true;
    return;
  }
  filterBar.replaceChildren(
    h(
      "span",
      { class: "chip" },
      avatar(state.artist, "sm"),
      h("span", {}, "אמן: ", h("strong", {}, state.artist)),
      h("button", { type: "button", class: "chip-close", "aria-label": "הסרת הסינון", onclick: () => setArtist("") }, icon("x"))
    )
  );
  filterBar.hidden = false;
}

function renderGroups(list, query) {
  const groups = new Map();
  for (const tab of list) {
    if (!groups.has(tab.artist)) groups.set(tab.artist, []);
    groups.get(tab.artist).push(tab);
  }
  const names = [...groups.keys()].sort(collator.compare);
  return names.map((name) => {
    const items = groups.get(name);
    return h(
      "section",
      { class: "artist-group" },
      h(
        "button",
        { type: "button", class: "group-head", onclick: () => setArtist(name), title: `רק הטאבים של ${name}` },
        avatar(name),
        h("span", { class: "group-name" }, highlight(name, query)),
        h("span", { class: "group-count" }, countLabel(items.length, "טאב אחד", "טאבים"))
      ),
      h("ul", { class: "tab-list" }, items.map((t) => cardFor(t, query, true)))
    );
  });
}

function render() {
  const tabs = loadTabs();
  const artistCount = new Set(tabs.map((t) => t.artist)).size;
  statsEl.textContent = tabs.length
    ? `${countLabel(tabs.length, "טאב אחד", "טאבים")} · ${countLabel(artistCount, "אמן אחד", "אמנים")}`
    : "כל הקישורים שלך לטאבים, במקום אחד";

  sortSelect.value = state.sort;
  viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
  toolbar.hidden = tabs.length === 0;

  if (state.artist && !tabs.some((t) => t.artist === state.artist)) state.artist = "";
  renderFilterBar();

  if (tabs.length === 0) {
    results.replaceChildren(emptyState());
    return;
  }

  const query = state.query.trim().toLowerCase();
  let list = tabs;
  if (state.artist) list = list.filter((t) => t.artist === state.artist);
  if (query) list = list.filter((t) => t.song.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
  list = sortTabs(list);

  const nodes = [];
  if (query || state.artist) {
    nodes.push(h("p", { class: "results-meta" }, list.length === 1 ? "נמצאה תוצאה אחת" : `נמצאו ${list.length} תוצאות`));
  }
  if (list.length === 0) {
    nodes.push(noResults());
  } else if (state.view === "artist" && !state.artist) {
    nodes.push(...renderGroups(list, query));
  } else {
    nodes.push(h("ul", { class: "tab-list" }, list.map((t) => cardFor(t, query, false))));
  }
  results.replaceChildren(...nodes);
}

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  render();
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchInput.value) {
    searchInput.value = state.query = "";
    render();
  }
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  savePrefs();
  render();
});

viewButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    state.view = btn.dataset.view;
    savePrefs();
    render();
  })
);

document.addEventListener("keydown", (e) => {
  const typing = e.target.closest("input, textarea, select, [contenteditable]");
  if (e.key === "/" && !typing && !toolbar.hidden) {
    e.preventDefault();
    searchInput.focus();
  }
});

window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    updateNavCount();
    render();
  }
});

render();
