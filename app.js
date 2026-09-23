const STORAGE_KEY = "guitar-tabs";

const form = document.getElementById("tab-form");
const linkInput = document.getElementById("link-input");
const songInput = document.getElementById("song-input");
const artistInput = document.getElementById("artist-input");
const formMessage = document.getElementById("form-message");
const searchInput = document.getElementById("search-input");
const listEl = document.getElementById("tabs-list");
const emptyMessage = document.getElementById("empty-message");
const countBadge = document.getElementById("count-badge");

function loadTabs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTabs(tabs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

// Site-specific parsers: given a URL object, return {song, artist} or null.
const siteParsers = [
  {
    test: (url) => url.hostname.includes("negina.co.il"),
    parse: (url) => {
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("chords");
      if (idx === -1 || parts.length < idx + 3) return null;
      const artist = decodeURIComponent(parts[idx + 1]).replace(/-/g, " ");
      const song = decodeURIComponent(parts[idx + 2]).replace(/-/g, " ");
      if (!artist || !song) return null;
      return { song, artist };
    },
  },
];

function autoDetect(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const parser = siteParsers.find((p) => p.test(url));
  return parser ? parser.parse(url) : null;
}

function sourceLabel(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

let autoFilledSong = "";
let autoFilledArtist = "";

linkInput.addEventListener("input", () => {
  const detected = autoDetect(linkInput.value.trim());
  if (!detected) return;

  if (songInput.value === "" || songInput.value === autoFilledSong) {
    songInput.value = detected.song;
    autoFilledSong = detected.song;
  }
  if (artistInput.value === "" || artistInput.value === autoFilledArtist) {
    artistInput.value = detected.artist;
    autoFilledArtist = detected.artist;
  }
});

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = "message " + (type || "");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const link = linkInput.value.trim();
  const song = songInput.value.trim();
  const artist = artistInput.value.trim();

  if (!link || !song || !artist) {
    showMessage("נא למלא קישור, שם שיר ואמן.", "error");
    return;
  }

  const tabs = loadTabs();
  if (tabs.some((t) => t.link === link)) {
    showMessage("הקישור הזה כבר נשמר ברשימה.", "error");
    return;
  }

  tabs.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    song,
    artist,
    link,
    source: sourceLabel(link),
    addedAt: new Date().toISOString(),
  });

  saveTabs(tabs);
  form.reset();
  autoFilledSong = "";
  autoFilledArtist = "";
  showMessage("הטאב נוסף בהצלחה!", "success");
  render();
});

function deleteTab(id) {
  const tabs = loadTabs().filter((t) => t.id !== id);
  saveTabs(tabs);
  render();
}

function render() {
  const tabs = loadTabs();
  const query = searchInput.value.trim().toLowerCase();

  const filtered = query
    ? tabs.filter(
        (t) =>
          t.song.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query)
      )
    : tabs;

  countBadge.textContent = tabs.length ? `(${tabs.length})` : "";
  listEl.innerHTML = "";

  if (tabs.length === 0) {
    emptyMessage.textContent = "עדיין לא הוספת טאבים. הדבק קישור למעלה כדי להתחיל.";
    emptyMessage.classList.remove("hidden");
    return;
  }

  if (filtered.length === 0) {
    emptyMessage.textContent = "לא נמצאו טאבים תואמים לחיפוש.";
    emptyMessage.classList.remove("hidden");
    return;
  }

  emptyMessage.classList.add("hidden");

  for (const tab of filtered) {
    const li = document.createElement("li");
    li.className = "tab-card";
    li.innerHTML = `
      <div class="tab-info">
        <span class="tab-song"></span>
        <span class="tab-artist"></span>
        <span class="tab-source"></span>
      </div>
      <div class="tab-actions">
        <a target="_blank" rel="noopener noreferrer">פתח</a>
        <button type="button">מחק</button>
      </div>
    `;
    li.querySelector(".tab-song").textContent = tab.song;
    li.querySelector(".tab-artist").textContent = tab.artist;
    li.querySelector(".tab-source").textContent = tab.source;
    const openLink = li.querySelector(".tab-actions a");
    openLink.href = tab.link;
    li.querySelector(".tab-actions button").addEventListener("click", () => {
      if (confirm(`למחוק את "${tab.song}" מהרשימה?`)) {
        deleteTab(tab.id);
      }
    });
    listEl.appendChild(li);
  }
}

searchInput.addEventListener("input", render);

render();
