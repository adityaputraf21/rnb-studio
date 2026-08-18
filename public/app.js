if (!requireLogin()) throw new Error("redirecting to login");

const state = {
  platform: "youtube",
  track: null,
  fileId: null,
  convertedMeta: null,
  selectedFile: null,
};

const PLATFORM_META = {
  youtube: { icon: "▶", placeholder: "Paste link YouTube" },
  spotify: { icon: "◉", placeholder: "Paste link Spotify" },
  soundcloud: { icon: "☁", placeholder: "Paste link SoundCloud" },
  tiktok: { icon: "♪", placeholder: "Paste link TikTok" },
  applemusic: { icon: "🎵", placeholder: "Paste link Apple Music" },
};

const els = {
  tabs: document.querySelectorAll(".ptab"),
  linkInputRow: document.getElementById("linkInputRow"),
  fileInputRow: document.getElementById("fileInputRow"),
  fileInput: document.getElementById("fileInput"),
  fileDropLabel: document.getElementById("fileDropLabel"),
  inputIcon: document.getElementById("inputIcon"),
  urlInput: document.getElementById("urlInput"),
  searchBtn: document.getElementById("searchBtn"),
  status: document.getElementById("status"),
  trackCard: document.getElementById("trackCard"),
  trackThumb: document.getElementById("trackThumb"),
  trackTitle: document.getElementById("trackTitle"),
  trackArtist: document.getElementById("trackArtist"),
  trackMeta: document.getElementById("trackMeta"),
  advToggle: document.getElementById("advToggle"),
  advArrow: document.getElementById("advArrow"),
  speedSlider: document.getElementById("speedSlider"),
  speedVal: document.getElementById("speedVal"),
  ampSlider: document.getElementById("ampSlider"),
  ampVal: document.getElementById("ampVal"),
  pitchSlider: document.getElementById("pitchSlider"),
  pitchVal: document.getElementById("pitchVal"),
  formatSelect: document.getElementById("formatSelect"),
  formatDetailLabel: document.getElementById("formatDetailLabel"),
  formatDetailValue: document.getElementById("formatDetailValue"),
  creatorSelect: document.getElementById("creatorSelect"),
  playbackNormalVal: document.getElementById("playbackNormalVal"),
  pitchCompensationVal: document.getElementById("pitchCompensationVal"),
  pitchCapNote: document.getElementById("pitchCapNote"),
  resetDefaultBtn: document.getElementById("resetDefaultBtn"),
  convertBtn: document.getElementById("convertBtn"),
  convertResult: document.getElementById("convertResult"),
  resultTitle: document.getElementById("resultTitle"),
  resultMeta: document.getElementById("resultMeta"),
  downloadBtn: document.getElementById("downloadBtn"),
  uploadBtn: document.getElementById("uploadBtn"),
  scriptCard: document.getElementById("scriptCard"),
  scriptNote: document.getElementById("scriptNote"),
  scriptOutput: document.getElementById("scriptOutput"),
  copyScriptBtn: document.getElementById("copyScriptBtn"),
  log: document.getElementById("log"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  userIdInput: document.getElementById("userIdInput"),
  groupIdInput: document.getElementById("groupIdInput"),
  saveCredsBtn: document.getElementById("saveCredsBtn"),
  whoName: document.getElementById("whoName"),
  whoAvatar: document.getElementById("whoAvatar"),
  tierBadge: document.getElementById("tierBadge"),
  adminNavLink: document.getElementById("adminNavLink"),
  upgradeCard: document.getElementById("upgradeCard"),
  upgradeBtn: document.getElementById("upgradeBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  usageBar: document.getElementById("usageBar"),
  upgradeModal: document.getElementById("upgradeModal"),
  planOptions: document.getElementById("planOptions"),
  closeModalBtn: document.getElementById("closeModalBtn"),
};

// ---------- session / topbar ----------
async function loadMe() {
  try {
    const res = await fetch("/api/auth/me", { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.href = "login.html"; return; }
    const data = await res.json();
    saveUser(data.user);
    els.whoName.textContent = data.user.username || "User";
    if (data.user.avatarUrl) { els.whoAvatar.src = data.user.avatarUrl; els.whoAvatar.style.display = ""; }
    if (data.user.role === "admin") els.adminNavLink.style.display = "";

    if (data.usage.tier === "paid") {
      els.tierBadge.textContent = "PREMIUM";
      els.tierBadge.className = "badge paid";
      els.usageBar.innerHTML = `<span>✨ Kamu Premium — convert unlimited</span>`;
      els.usageBar.classList.remove("warn");
      els.upgradeCard.style.display = "none";
    } else {
      els.tierBadge.textContent = "FREE";
      els.tierBadge.className = "badge free";
      const { used, limit, remaining } = data.usage;
      els.usageBar.innerHTML = `<span>Jatah gratis hari ini: <strong>${used}/${limit}</strong></span><span>${remaining} tersisa</span>`;
      els.usageBar.classList.toggle("warn", remaining === 0);
      els.upgradeCard.style.display = "";
    }
  } catch {}
}
els.logoutBtn.addEventListener("click", () => { clearSession(); window.location.href = "login.html"; });

// ---------- Roblox creds (local) ----------
function loadCreds() {
  try {
    const saved = JSON.parse(localStorage.getItem("robloxAudioCreds") || "{}");
    if (saved.apiKey) els.apiKeyInput.value = saved.apiKey;
    if (saved.userId) els.userIdInput.value = saved.userId;
    if (saved.groupId) els.groupIdInput.value = saved.groupId;
  } catch {}
  refreshCreatorOptions();
}
els.saveCredsBtn.addEventListener("click", () => {
  const creds = { apiKey: els.apiKeyInput.value.trim(), userId: els.userIdInput.value.trim(), groupId: els.groupIdInput.value.trim() };
  localStorage.setItem("robloxAudioCreds", JSON.stringify(creds));
  refreshCreatorOptions();
  logLine("Kredensial disimpan di browser lokal kamu.", "ok");
});
function refreshCreatorOptions() {
  const userId = els.userIdInput.value.trim();
  const groupId = els.groupIdInput.value.trim();
  els.creatorSelect.innerHTML = "";
  if (userId) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify({ userId });
    opt.textContent = `Akun Pribadi (User ${userId})`;
    els.creatorSelect.appendChild(opt);
  }
  if (groupId) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify({ groupId });
    opt.textContent = `Group (${groupId})`;
    els.creatorSelect.appendChild(opt);
  }
  if (!userId && !groupId) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Isi User ID / Group ID di panel kanan dulu";
    els.creatorSelect.appendChild(opt);
  }
}
els.userIdInput.addEventListener("input", refreshCreatorOptions);
els.groupIdInput.addEventListener("input", refreshCreatorOptions);

// ---------- platform tabs ----------
els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.platform = tab.dataset.platform;
    resetTrack();

    if (state.platform === "upload") {
      els.linkInputRow.classList.add("hidden");
      els.fileInputRow.classList.remove("hidden");
    } else {
      els.linkInputRow.classList.remove("hidden");
      els.fileInputRow.classList.add("hidden");
      const meta = PLATFORM_META[state.platform];
      els.inputIcon.textContent = meta.icon;
      els.urlInput.placeholder = meta.placeholder;
    }
  });
});

els.fileInput.addEventListener("change", () => {
  const file = els.fileInput.files[0];
  if (!file) return;
  state.selectedFile = file;
  els.fileDropLabel.textContent = `✅ ${file.name}`;
  state.track = { title: file.name.replace(/\.[^.]+$/, ""), artist: "" };
  setStatus("File siap di-convert", "ok");
});

// ---------- resolve (search) for link-based platforms ----------
els.searchBtn.addEventListener("click", resolveTrack);
els.urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") resolveTrack(); });

async function resolveTrack() {
  const url = els.urlInput.value.trim();
  if (!url) return setStatus("Masukin link dulu", "err");
  setStatus("Mencari...", "loading");
  resetTrack(true);

  try {
    const res = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ url, platform: state.platform }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    state.track = data.track;
    els.trackThumb.src = data.track.thumbnail || "";
    els.trackTitle.textContent = data.track.title;
    els.trackArtist.textContent = data.track.artist || "";
    els.trackMeta.textContent = data.track.duration ? `${Math.floor(data.track.duration / 60)}:${String(data.track.duration % 60).padStart(2, "0")}` : "";
    els.trackCard.classList.remove("hidden");
    setStatus("Loaded", "ok");
  } catch (err) {
    setStatus(err.message || "Gagal ambil data", "err");
  }
}

function resetTrack(keepFile) {
  state.track = null;
  state.fileId = null;
  state.convertedMeta = null;
  if (!keepFile) state.selectedFile = null;
  els.trackCard.classList.add("hidden");
  els.convertResult.classList.add("hidden");
  els.scriptCard.classList.add("hidden");
  setStatus("");
}

// ---------- Roblox compensation script generator ----------
// Sound.PlaybackSpeed changes BOTH tempo and pitch together (unlike our
// rubberband conversion, which preserves pitch). So restoring the original
// tempo in-game with just PlaybackSpeed would also drop the pitch — we pair
// it with a PitchShiftSoundEffect to compensate. Roblox caps Octave at 2.0,
// so speeds above 2x can't be fully corrected — we note that in the script.
function buildRobloxScript(speed, assetId) {
  const playbackSpeed = (1 / speed).toFixed(4);
  const octaveNeeded = speed;
  const octaveCapped = Math.min(octaveNeeded, 2);
  const isCapped = octaveNeeded > 2;

  const assetLine = assetId
    ? `sound.SoundId = "rbxassetid://${assetId}"`
    : `sound.SoundId = "rbxassetid://ISI_ASSET_ID_DISINI" -- upload dulu buat dapetin Asset ID`;

  const capNote = isCapped
    ? `-- CATATAN: Roblox membatasi PitchShiftSoundEffect.Octave maksimal 2.0,\n-- jadi nada gak bisa dikompensasi 100% balik ke asli (butuh ${octaveNeeded.toFixed(2)}, dibatasi ke 2.0).\n`
    : "";

  return `-- Auto-generated by RNB Studio
-- File ini di-convert dengan speed ${speed}x.
-- Script ini bikin tempo balik ke normal pas diputer di game (PlaybackSpeed),
-- dikompensasi juga nadanya (PitchShiftSoundEffect) biar gak ngebass.
${capNote}
local sound = script.Parent -- Ganti dengan path ke Sound object kamu
${assetLine}
sound.PlaybackSpeed = ${playbackSpeed}

local pitchShift = Instance.new("PitchShiftSoundEffect")
pitchShift.Octave = ${octaveCapped.toFixed(2)}
pitchShift.Parent = sound

sound:Play()`;
}

function showScriptCard(speed, assetId) {
  const speedNum = Number(speed);
  els.scriptOutput.value = buildRobloxScript(speedNum, assetId);
