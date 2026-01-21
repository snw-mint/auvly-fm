const POLL_INTERVAL = 5000;
const LASTFM_API_BASE = CONFIG.apiUrl("?method=");
const SPOTIFY_TOKEN_API = CONFIG.apiUrl("spotify-token");
const defaultSettings = { layout: "layout-center", showTrack: !0, showArtist: !0, bgMode: "artist", blurBg: !0 };
let currentSettings = JSON.parse(localStorage.getItem("tunecharts_live_settings")) || defaultSettings;
const elements = {
    bgLayer: document.getElementById("bg-layer"),
    solidBgLayer: document.getElementById("solid-bg-layer"),
    albumArt: document.getElementById("album-art"),
    artPlaceholder: document.getElementById("art-placeholder"),
    trackName: document.getElementById("track-name"),
    artistName: document.getElementById("artist-name"),
    userAvatar: document.getElementById("user-avatar"),
    userDisplayName: document.getElementById("user-display-name"),
    userTag: document.querySelector(".user-tag"),
    playerContainer: document.getElementById("player-container"),
    menu: document.getElementById("settings-menu"),
    overlay: document.getElementById("sidebar-overlay"),
    menuTrigger: document.getElementById("user-settings-trigger"),
    closeBtn: document.getElementById("close-menu"),
    layoutBtns: document.querySelectorAll(".layout-btn"),
    bgModeBtns: document.querySelectorAll(".bg-mode-btn"),
    toggleTrack: document.getElementById("toggle-track"),
    toggleArtist: document.getElementById("toggle-artist"),
    toggleBlur: document.getElementById("toggle-blur"),
    blurControlRow: document.getElementById("blur-control-row"),
};
let params = new URLSearchParams(window.location.search);
let username = params.get("user");
let lastTrackSignature = "";
let spotifyTokenCache = null;
let currentTrackData = null;
let currentSpotifyImages = { artist: null, album: null };
async function init() {
    if (!username) {
        window.location.href = "index.html";
        return;
    }
    applySettingsToUI();
    setupMenuEvents();
    showTooltip();
    buscarInfoUsuario();
    await checkNowPlaying();
    setInterval(checkNowPlaying, POLL_INTERVAL);
}
function showTooltip() {
    setTimeout(() => {
        elements.userTag.classList.add("visible");
        elements.userTag.classList.add("show-tooltip");
    }, 1000);
    setTimeout(() => {
        elements.userTag.classList.remove("show-tooltip");
        elements.userTag.classList.remove("visible");
    }, 8000);
}
function setupMenuEvents() {
    elements.menuTrigger.addEventListener("click", () => {
        elements.menu.classList.add("active");
        elements.overlay.classList.add("active");
        elements.userTag.classList.remove("show-tooltip");
    });
    const closeMenu = () => {
        elements.menu.classList.remove("active");
        elements.overlay.classList.remove("active");
    };
    elements.closeBtn.addEventListener("click", closeMenu);
    elements.overlay.addEventListener("click", closeMenu);
    elements.toggleTrack.checked = currentSettings.showTrack;
    elements.toggleArtist.checked = currentSettings.showArtist;
    elements.toggleBlur.checked = currentSettings.blurBg;
    updateOptionButtons();
    elements.toggleTrack.addEventListener("change", (e) => saveSetting("showTrack", e.target.checked));
    elements.toggleArtist.addEventListener("change", (e) => saveSetting("showArtist", e.target.checked));
    elements.toggleBlur.addEventListener("change", (e) => saveSetting("blurBg", e.target.checked));
    elements.layoutBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const layout = e.target.getAttribute("data-layout");
            saveSetting("layout", layout);
            updateOptionButtons();
        });
    });
    elements.bgModeBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const mode = e.target.getAttribute("data-bg-mode");
            saveSetting("bgMode", mode);
            updateOptionButtons();
            forceBackgroundUpdate();
        });
    });
}
function updateOptionButtons() {
    elements.layoutBtns.forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-layout") === currentSettings.layout);
    });
    elements.bgModeBtns.forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-bg-mode") === currentSettings.bgMode);
    });
    if (currentSettings.bgMode === "solid") {
        elements.blurControlRow.style.display = "none";
    } else {
        elements.blurControlRow.style.display = "flex";
    }
}
function saveSetting(key, value) {
    currentSettings[key] = value;
    localStorage.setItem("tunecharts_live_settings", JSON.stringify(currentSettings));
    applySettingsToUI();
}
function applySettingsToUI() {
    elements.playerContainer.className = `player-container ${currentSettings.layout}`;
    elements.trackName.classList.toggle("hidden-element", !currentSettings.showTrack);
    elements.artistName.classList.toggle("hidden-element", !currentSettings.showArtist);
    if (currentSettings.blurBg) document.body.classList.remove("disable-blur");
    else document.body.classList.add("disable-blur");
    if (currentSettings.bgMode === "solid") {
        document.body.classList.add("bg-mode-solid");
        extractAndApplyColor();
    } else {
        document.body.classList.remove("bg-mode-solid");
    }
}
async function checkNowPlaying() {
    try {
        const url = `${LASTFM_API_BASE}user.getrecenttracks&user=${username}&limit=1&_t=${Date.now()}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
            setIdleState();
            return;
        }
        const track = data.recenttracks.track[0];
        const isNowPlaying = track["@attr"] && track["@attr"].nowplaying === "true";
        if (isNowPlaying) {
            const trackSignature = `${track.name}-${track.artist["#text"]}`;
            if (trackSignature !== lastTrackSignature) {
                lastTrackSignature = trackSignature;
                await updateUI(track);
            }
        } else {
            if (lastTrackSignature !== "IDLE") {
                lastTrackSignature = "IDLE";
                setIdleState();
            }
        }
    } catch (error) {
        console.error("Last.fm error:", error);
    }
}
async function updateUI(track) {
    currentTrackData = track;
    updateText(elements.trackName, track.name);
    updateText(elements.artistName, track.artist["#text"]);
    document.title = `${track.name} • Live`;
    currentSpotifyImages = await buscarImagensSpotify(track.artist["#text"], track.name);
    const albumUrl = currentSpotifyImages.album || track.image.find((i) => i.size === "extralarge")?.["#text"];
    updateAlbumArt(albumUrl);
    updateBackgroundImage(albumUrl);
}
function forceBackgroundUpdate() {
    if (!currentTrackData) return;
    const albumUrl =
        currentSpotifyImages.album || currentTrackData.image.find((i) => i.size === "extralarge")?.["#text"];
    updateBackgroundImage(albumUrl);
}
function updateAlbumArt(url) {
    if (url && url !== elements.albumArt.src) {
        const imgLoader = new Image();
        imgLoader.crossOrigin = "Anonymous";
        imgLoader.src = url;
        imgLoader.onload = () => {
            elements.albumArt.classList.remove("visible");
            setTimeout(() => {
                elements.albumArt.src = url;
                elements.artPlaceholder.style.display = "none";
                elements.albumArt.style.display = "block";
                void elements.albumArt.offsetWidth;
                elements.albumArt.classList.add("visible");
                extractAndApplyColor();
            }, 500);
        };
    } else if (!url) {
        hideAlbumArt();
    }
}
function updateBackgroundImage(albumUrl) {
    let targetUrl = null;
    if (currentSettings.bgMode === "artist") targetUrl = currentSpotifyImages.artist || albumUrl;
    else if (currentSettings.bgMode === "album") targetUrl = albumUrl;
    if (targetUrl) {
        const img = new Image();
        img.src = targetUrl;
        img.onload = () => {
            elements.bgLayer.style.backgroundImage = `url('${targetUrl}')`;
        };
    }
}
function extractAndApplyColor() {
    try {
        const img = elements.albumArt;
        if (!img.src || img.style.display === "none") return;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0,
            g = 0,
            b = 0;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        const count = data.length / 4;
        r = Math.floor((r / count) * 0.5);
        g = Math.floor((g / count) * 0.5);
        b = Math.floor((b / count) * 0.5);
        elements.solidBgLayer.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    } catch (e) {
        elements.solidBgLayer.style.backgroundColor = "#111";
    }
}
function setIdleState() {
    const msgs = ["Silence is golden...", "Waiting for music...", "Nothing playing right now."];
    updateText(elements.trackName, msgs[Math.floor(Math.random() * msgs.length)]);
    updateText(elements.artistName, "");
    document.title = "TuneCharts Live";
    hideAlbumArt();
    elements.bgLayer.style.backgroundImage = "none";
    elements.solidBgLayer.style.backgroundColor = "#0f0f0f";
}
function hideAlbumArt() {
    if (elements.albumArt.classList.contains("visible")) {
        elements.albumArt.classList.remove("visible");
        setTimeout(() => {
            elements.albumArt.style.display = "none";
            elements.artPlaceholder.style.display = "flex";
        }, 500);
    } else {
        elements.albumArt.style.display = "none";
        elements.artPlaceholder.style.display = "flex";
    }
}
function updateText(element, newText) {
    if (element.textContent === newText) return;
    element.classList.add("fade-text", "fade-out");
    setTimeout(() => {
        element.textContent = newText;
        element.classList.remove("fade-out");
        element.classList.add("fade-in");
        setTimeout(() => element.classList.remove("fade-in"), 500);
    }, 500);
}
async function obterTokenSpotify() {
    if (spotifyTokenCache) return spotifyTokenCache;
    try {
        const res = await fetch(SPOTIFY_TOKEN_API);
        const data = await res.json();
        if (data.access_token) {
            spotifyTokenCache = data.access_token;
            setTimeout(() => (spotifyTokenCache = null), 3000 * 1000);
            return data.access_token;
        }
    } catch (e) {
        console.warn("Token error:", e);
    }
    return null;
}
async function buscarImagensSpotify(artist, trackName) {
    const token = await obterTokenSpotify();
    if (!token) return { artist: null, album: null };
    const cleanArtist = encodeURIComponent(artist);
    const cleanTrack = encodeURIComponent(trackName.split(" - ")[0].split("(")[0]);
    const result = { artist: null, album: null };
    try {
       const urlArtist = \https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(cleanArtist)}&type=artist&limit=1`;`
        const resArtist = await fetch(urlArtist, { headers: { Authorization: `Bearer ${token}` } });
        const dataArtist = await resArtist.json();
        if (dataArtist.artists?.items?.length > 0) result.artist = dataArtist.artists.items[0].images[0]?.url;
       const urlTrack = \https://api.spotify.com/v1/search?q=track:${encodeURIComponent(cleanTrack)}%20artist:${encodeURIComponent(cleanArtist)}&type=track&limit=1`;`
        const resTrack = await fetch(urlTrack, { headers: { Authorization: `Bearer ${token}` } });
        const dataTrack = await resTrack.json();
        if (dataTrack.tracks?.items?.length > 0) result.album = dataTrack.tracks.items[0].album.images[0]?.url;
    } catch (e) {
        console.warn("Spotify search error:", e);
    }
    return result;
}
async function buscarInfoUsuario() {
    try {
        const url = `${LASTFM_API_BASE}user.getinfo&user=${username}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.user) {
            elements.userDisplayName.textContent = data.user.name;
            const img = data.user.image.find((i) => i.size === "medium") || data.user.image[0];
            if (img && img["#text"]) {
                elements.userAvatar.src = img["#text"];
                elements.userAvatar.classList.remove("hidden");
            }
        }
    } catch (e) {
        elements.userTag.style.display = "none";
    }
}
document.addEventListener("DOMContentLoaded", init);
