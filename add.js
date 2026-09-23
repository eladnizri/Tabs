const form = document.getElementById("tab-form");
const linkInput = document.getElementById("link-input");
const songInput = document.getElementById("song-input");
const artistInput = document.getElementById("artist-input");
const pasteBtn = document.getElementById("paste-btn");
const detectStatus = document.getElementById("detect-status");
const formError = document.getElementById("form-error");
const preview = document.getElementById("preview");
const previewSlot = document.getElementById("preview-slot");
const recentSection = document.getElementById("recent");
const recentList = document.getElementById("recent-list");
const artistSuggestions = document.getElementById("artist-suggestions");

// Remember what we auto-filled so we only overwrite fields the user hasn't edited.
let autoSong = "";
let autoArtist = "";

function setStatus(type, text) {
  if (!type) {
    detectStatus.hidden = true;
    return;
  }
  const iconName = { success: "sparkle", warn: "alert", info: "info" }[type];
  detectStatus.className = `detect-status ${type}`;
  detectStatus.replaceChildren(icon(iconName), h("span", {}, text));
  detectStatus.hidden = false;
}

function findDuplicate(link) {
  const target = canonicalUrl(link);
  return loadTabs().find((t) => canonicalUrl(t.link) === target);
}

function handleLinkChange() {
  const raw = linkInput.value.trim();
  const link = normalizeUrl(raw);
  linkInput.classList.remove("invalid");

  if (!raw) {
    setStatus(null);
  } else if (!parseHttpUrl(link)) {
    setStatus("warn", "זה לא נראה כמו קישור תקין");
  } else {
    const dup = findDuplicate(link);
    const detected = autoDetect(link);
    if (detected) {
      if (!songInput.value || songInput.value === autoSong) songInput.value = autoSong = detected.song;
      if (!artistInput.value || artistInput.value === autoArtist) artistInput.value = autoArtist = detected.artist;
    }
    if (dup) {
      setStatus("warn", `הקישור הזה כבר שמור בספרייה: ${dup.song} · ${dup.artist}`);
    } else if (detected) {
      setStatus("success", `זוהה אוטומטית מ-${sourceLabel(link)}`);
    } else {
      setStatus("info", `${sourceLabel(link)} — מלא שם שיר ואמן`);
    }
  }
  updatePreview();
}

function updatePreview() {
  const song = songInput.value.trim();
  const artist = artistInput.value.trim();
  const link = normalizeUrl(linkInput.value);
  if (!song && !artist) {
    preview.hidden = true;
    return;
  }
  previewSlot.replaceChildren(
    tabCard({ song: song || "שם השיר", artist: artist || "אמן", link, source: sourceLabel(link) }, { preview: true })
  );
  preview.hidden = false;
}

function showError(message, field) {
  formError.replaceChildren(icon("alert"), h("span", {}, message));
  formError.hidden = false;
  if (field) {
    field.classList.add("invalid");
    field.focus();
  }
}

function clearError() {
  formError.hidden = true;
  [linkInput, songInput, artistInput].forEach((el) => el.classList.remove("invalid"));
}

function renderRecent() {
  const tabs = loadTabs();
  recentSection.hidden = tabs.length === 0;
  recentList.replaceChildren(...tabs.slice(0, 3).map((t) => tabCard(t)));

  const artists = [...new Set(tabs.map((t) => t.artist))].sort(new Intl.Collator("he").compare);
  artistSuggestions.replaceChildren(...artists.map((a) => h("option", { value: a })));
}

linkInput.addEventListener("input", handleLinkChange);
linkInput.addEventListener("paste", () => {
  setTimeout(() => {
    linkInput.value = prettyUrl(linkInput.value.trim());
    handleLinkChange();
  });
});
songInput.addEventListener("input", () => {
  songInput.classList.remove("invalid");
  updatePreview();
});
artistInput.addEventListener("input", () => {
  artistInput.classList.remove("invalid");
  updatePreview();
});

if (navigator.clipboard && navigator.clipboard.readText) {
  pasteBtn.hidden = false;
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        showToast("הלוח ריק", { type: "error" });
        return;
      }
      linkInput.value = prettyUrl(text);
      handleLinkChange();
      const next = !songInput.value ? songInput : !artistInput.value ? artistInput : form.querySelector("[type=submit]");
      next.focus();
    } catch {
      showToast("אין גישה ללוח. הדבק ידנית (Ctrl+V)", { type: "error" });
      linkInput.focus();
    }
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearError();

  const rawLink = normalizeUrl(linkInput.value);
  const link = canonicalUrl(rawLink);
  const song = songInput.value.trim();
  const artist = artistInput.value.trim();

  if (!rawLink) return showError("צריך להדביק קישור לדף הטאב.", linkInput);
  if (!link) return showError("הקישור לא תקין. הוא צריך להתחיל ב-https://", linkInput);
  if (!song) return showError("חסר שם שיר.", songInput);
  if (!artist) return showError("חסר שם אמן.", artistInput);

  const tabs = loadTabs();
  const dup = findDuplicate(link);
  if (dup) return showError(`הקישור הזה כבר שמור בספרייה (${dup.song} · ${dup.artist}).`, linkInput);

  tabs.unshift({ id: newId(), song, artist, link, source: sourceLabel(link), addedAt: new Date().toISOString() });
  saveTabs(tabs);

  form.reset();
  autoSong = autoArtist = "";
  setStatus(null);
  updatePreview();
  renderRecent();
  linkInput.focus();

  showToast(`"${song}" נוסף לספרייה`, {
    type: "success",
    actionLabel: "לספרייה",
    onAction: () => (location.href = "my-tabs.html"),
  });
});

window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    updateNavCount();
    renderRecent();
  }
});

renderRecent();
