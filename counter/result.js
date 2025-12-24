const params = new URLSearchParams(window.location.search);
const username = params.get("user");
if (!username) window.location.href = "index.html";
let currentPeriod = "1month";
let selectedAccentColor = "#bb86fc";
let selectedFormat = "story";
let chartsToInclude = ["artists", "tracks"];
let elements = {};
let globalTopArtistImage = "";
let spotifyTokenCache = null;
let cachedData = { artists: [], tracks: [] };
async function carregarTudo() {
    elements = {
        btnInfo: document.getElementById("btnInfo"),
        disclaimerModal: document.getElementById("disclaimerModal"),
        bannerBackground: document.getElementById("bannerBackground"),
        userFoto: document.getElementById("userFoto"),
        userName: document.getElementById("userName"),
        userScrobbles: document.getElementById("userScrobbles"),
        scrobblesPerDay: document.getElementById("scrobblesPerDay"),
        monthlyLabel: document.querySelector(".monthly-label"),
        glider: document.querySelector(".toggle-glider"),
        formatModal: document.getElementById("formatPickerModal"),
        colorModal: document.getElementById("colorPickerModal"),
        columnModal: document.getElementById("columnPickerModal"),
        closeBtns: document.querySelectorAll(".close-button"),
        genReportBtn: document.getElementById("btnGerarRelatorio"),
        formatOptions: document.querySelectorAll(".format-option"),
        colorOptions: document.querySelectorAll(".color-option"),
        chartColOptions: document.querySelectorAll(".chart-col-option"),
        confirmColumnsBtn: document.getElementById("confirmColumnsBtn"),
        storyCard: document.getElementById("storyCard"),
        storyUserImg: document.getElementById("storyUserImg"),
        storyTitle: document.getElementById("storyTitle"),
        storySubtitle: document.getElementById("storySubtitle"),
        storyScrobblesValue: document.getElementById("storyScrobblesValue"),
        storyScrobblesLabel: document.getElementById("storyScrobblesLabel"),
        storyDisclaimer: document.getElementById("storyDisclaimer"),
        storyCol1Title: document.getElementById("storyCol1Title"),
        storyCol1List: document.getElementById("storyCol1List"),
        storyCol2Title: document.getElementById("storyCol2Title"),
        storyCol2List: document.getElementById("storyCol2List"),
        squareCard: document.getElementById("squareCardV2"),
        sqUserImg: document.getElementById("sqUserImg"),
        sqUsername: document.getElementById("sqUsername"),
        sqReportTitle: document.getElementById("sqReportTitle"),
        sqCol1Title: document.getElementById("sqCol1Title"),
        sqCol1List: document.getElementById("sqCol1List"),
        sqCol2Title: document.getElementById("sqCol2Title"),
        sqCol2List: document.getElementById("sqCol2List"),
        sqScrobblesLabel: document.getElementById("sqScrobblesLabel"),
        sqScrobblesValue: document.getElementById("sqScrobblesValue"),
    };
    configurarEventosHub();
    configurarTogglePeriodo();
    await buscarPerfil();
    atualizarDadosDoPeriodo(!0);
}
function configurarTogglePeriodo() {
    const buttons = document.querySelectorAll(".toggle-option");
    buttons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const clickedButton = e.currentTarget;
            buttons.forEach((b) => b.classList.remove("active"));
            clickedButton.classList.add("active");
            currentPeriod = clickedButton.getAttribute("data-period");
            moveGlider(clickedButton);
            atualizarDadosDoPeriodo(!1);
        });
    });
}

function moveGlider(targetButton) {
    if (!elements.glider || !targetButton) return;
    const offsetLeft = targetButton.offsetLeft;
    const width = targetButton.offsetWidth;
    elements.glider.style.width = `${width}px`;
    elements.glider.style.transform = `translateX(${offsetLeft}px)`;
}

async function atualizarDadosDoPeriodo(isInitialLoad = !1) {
    let reportSubtitle = "";
    let labelText = "";
    let scrobblesLabel = "";
    if (currentPeriod === "7day") {
        reportSubtitle = "Last 7 Days";
        labelText = "Calculated from last 7 days";
        scrobblesLabel = "Weekly Time";
    } else if (currentPeriod === "1month") {
        reportSubtitle = "Last 30 Days";
        labelText = "Calculated from last 30 days";
        scrobblesLabel = "Monthly Time";
    } else if (currentPeriod === "12month") {
        reportSubtitle = "Last 365 Days";
        labelText = "Calculated from last 12 months";
        scrobblesLabel = "Annual Time";
    }
    if (elements.storySubtitle) elements.storySubtitle.textContent = reportSubtitle;
    if (elements.sqReportTitle) elements.sqReportTitle.textContent = reportSubtitle;
    if (elements.storyScrobblesLabel) elements.storyScrobblesLabel.textContent = scrobblesLabel;
    if (elements.sqScrobblesLabel) elements.sqScrobblesLabel.textContent = scrobblesLabel;
    if (elements.monthlyLabel) elements.monthlyLabel.textContent = labelText;
    if (elements.storyDisclaimer) elements.storyDisclaimer.textContent = labelText;
    resetarChartsParaSkeleton();
    globalTopArtistImage = "";
    atualizarBanner("");
    await calcularTempoOuvido();
    if (isInitialLoad) {
        const activeButton = document.querySelector(".toggle-option.active");
        if (activeButton) setTimeout(() => moveGlider(activeButton), 100);
    }
}
function resetarChartsParaSkeleton() {
    const skeletonTop1 = `
        <div class="chart-item skeleton top-1">
            <div class="cover-placeholder" style="background: #333;"></div>
            <span class="skeleton-text" style="width: 60%;"></span>
        </div>`;
    const skeletonItem = `<div class="chart-item skeleton"></div>`;
    document.querySelectorAll(".lista-top").forEach((el) => {
        el.innerHTML = skeletonTop1 + skeletonItem.repeat(9);
    });
    if (elements.userScrobbles) elements.userScrobbles.innerHTML = "----";
    if (elements.scrobblesPerDay) elements.scrobblesPerDay.innerHTML = "--";
}
async function obterTokenSpotify() {
    if (spotifyTokenCache) return spotifyTokenCache;
    try {
        const res = await fetch("/api/spotify-token");
        const data = await res.json();
        if (data.access_token) {
            spotifyTokenCache = data.access_token;
            return data.access_token;
        }
    } catch (e) {
        console.warn("Falha token Spotify:", e);
    }
    return null;
}
async function buscarImagemSpotify(artist, trackName, type) {
    const token = await obterTokenSpotify();
    if (!token) return null;
    const cleanArtist = encodeURIComponent(artist);
    const cleanTrack = trackName ? encodeURIComponent(trackName.split(" - ")[0].split("(")[0]) : "";
    let query = "";
    let searchType = "";
    if (type === "artist") {
        query = `q=artist:"${cleanArtist}"`;
        searchType = "artist";
    } else {
        query = `q=track:"${cleanTrack}" artist:"${cleanArtist}"`;
        searchType = "track";
    }
    try {
        const url = `https://api.spotify.com/v1/search?${query}&type=${searchType}&limit=1`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (type === "artist" && data.artists?.items?.length > 0) {
            return data.artists.items[0].images[0]?.url;
        } else if (type === "track" && data.tracks?.items?.length > 0) {
            return data.tracks.items[0].album.images[0]?.url;
        }
    } catch (e) {
        return null;
    }
    return null;
}
async function buscarPerfil() {
    try {
        const url = `/api/?method=user.getinfo&user=${username}`;
        const res = await fetch(url);
        const data = await res.json();
        const user = data.user;
        const displayName = user.realname || user.name;
        elements.userName.textContent = displayName;
        elements.storyTitle.textContent = displayName;
        elements.sqUsername.textContent = displayName;
        elements.userName.classList.remove("skeleton");
        const img = user.image.find((i) => i.size === "extralarge") || user.image.pop();
        if (img && img["#text"]) {
            elements.userFoto.src = img["#text"];
            elements.storyUserImg.crossOrigin = "anonymous";
            elements.storyUserImg.src = img["#text"];
            elements.sqUserImg.crossOrigin = "anonymous";
            elements.sqUserImg.src = img["#text"];
        }
        elements.userFoto.classList.remove("skeleton");
    } catch (error) {
        elements.userName.textContent = username;
        elements.userName.classList.remove("skeleton");
    }
}
async function calcularTempoOuvido() {
    try {
        let totalSeconds = 0;
        let artistMap = {};
        let trackList = [];
        const limit = 1000;
        const url = `/api/?method=user.gettoptracks&user=${username}&limit=${limit}&period=${currentPeriod}`;
        const res = await fetch(url);
        const data = await res.json();
        let tracks = [];
        if (data.toptracks && data.toptracks.track) {
            tracks = Array.isArray(data.toptracks.track) ? data.toptracks.track : [data.toptracks.track];
        }
        tracks.forEach((track) => {
            let duration = parseInt(track.duration);
            const playcount = parseInt(track.playcount);
            if (duration > 0) {
                const trackTotalSeconds = duration * playcount;
                totalSeconds += trackTotalSeconds;
                trackList.push({
                    name: track.name,
                    artist: { name: track.artist.name },
                    seconds: trackTotalSeconds,
                    playcount: playcount,
                });
                if (artistMap[track.artist.name]) {
                    artistMap[track.artist.name] += trackTotalSeconds;
                } else {
                    artistMap[track.artist.name] = trackTotalSeconds;
                }
            }
        });
        const totalMinutes = Math.floor(totalSeconds / 60);
        const formattedTotal = totalMinutes.toLocaleString("en-US") + " Minutes";
        let daysInPeriod = 30;
        if (currentPeriod === "7day") daysInPeriod = 7;
        if (currentPeriod === "12month") daysInPeriod = 365;
        const dailyAverage = Math.round(totalMinutes / daysInPeriod);
        const formattedDaily = dailyAverage.toLocaleString("en-US") + " Mins/Day";
        if (elements.scrobblesPerDay) {
            elements.scrobblesPerDay.textContent = formattedDaily;
            elements.scrobblesPerDay.classList.remove("skeleton");
        }
        if (elements.userScrobbles) elements.userScrobbles.textContent = formattedTotal;
        if (elements.storyScrobblesValue) elements.storyScrobblesValue.textContent = formattedTotal;
        if (elements.sqScrobblesValue) elements.sqScrobblesValue.textContent = formattedTotal;
        const sortedArtists = Object.keys(artistMap)
            .map((artistName) => {
                return { name: artistName, seconds: artistMap[artistName] };
            })
            .sort((a, b) => b.seconds - a.seconds);
        const sortedTracks = trackList.sort((a, b) => b.seconds - a.seconds);
        cachedData.artists = sortedArtists;
        cachedData.tracks = sortedTracks;
        renderizarPreviewLista("cardArtists", cachedData.artists, "artist");
        renderizarPreviewLista("cardTracks", cachedData.tracks, "track");
        if (sortedArtists.length > 0) {
            const topArtistName = sortedArtists[0].name;
            buscarImagemSpotify(topArtistName, "", "artist").then((url) => {
                if (url) {
                    globalTopArtistImage = url;
                    atualizarBanner(url);
                    const top1ImgEl = document.querySelector("#cardArtists .top-1 .cover-placeholder");
                    if (top1ImgEl) top1ImgEl.style.backgroundImage = `url('${url}')`;
                }
            });
        }
        if (sortedTracks.length > 0) {
            const topTrack = sortedTracks[0];
            buscarImagemSpotify(topTrack.artist.name, topTrack.name, "track").then((url) => {
                if (url) {
                    const top1TrackEl = document.querySelector("#cardTracks .top-1 .cover-placeholder");
                    if (top1TrackEl) top1TrackEl.style.backgroundImage = `url('${url}')`;
                }
            });
        }
    } catch (error) {
        console.error("Erro calculando tempo:", error);
        if (elements.userScrobbles) elements.userScrobbles.textContent = "Error";
        document.querySelectorAll(".lista-top").forEach((el) => (el.innerHTML = "Error loading."));
    } finally {
        if (elements.userScrobbles) elements.userScrobbles.classList.remove("skeleton");
    }
}
function renderizarPreviewLista(elementId, dataList, type) {
    const mainItems = dataList.slice(0, 10);
    const container = document.querySelector(`#${elementId} .lista-top`);
    if (!container) return;
    let htmlMain = "";
    mainItems.forEach((item, i) => {
        const isTop1 = i === 0;
        let text = item.name;
        let subtext = "";
        const timeStr = formatTimeShort(item.seconds);
        if (type === "track") {
            subtext = `<span style="opacity:0.6"> - ${item.artist.name}</span>`;
        }
        const imgId = `img-${type}-${i}`;
        if (isTop1) {
            htmlMain += `
            <div class="chart-item top-1">
                <div id="${imgId}" class="cover-placeholder"></div>
                <div class="text-content">
                    <span class="rank-number">#1</span>
                    <div>
                        <span>${text}${subtext}</span>
                        <span style="display:block; font-size: 0.85em; opacity: 0.8; margin-top: 2px;">${timeStr}</span>
                    </div>
                </div>
            </div>`;
        } else {
            htmlMain += `
            <div class="chart-item">
                <div style="flex:1;">#${i + 1} - ${text}${subtext}</div>
                <div style="font-size:0.85em; opacity:0.8; margin-left:10px;">${timeStr}</div>
            </div>`;
        }
    });
    container.innerHTML = htmlMain || "No data.";
}
function formatTimeShort(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    return `${m}m`;
}
function atualizarBanner(imgUrl) {
    if (!elements.bannerBackground) return;
    if (imgUrl && imgUrl.length > 0) {
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => {
             elements.bannerBackground.style.backgroundImage = `url('${imgUrl}')`;
             elements.bannerBackground.style.opacity = 1;
        };
    } else {
        elements.bannerBackground.style.opacity = 0;
        setTimeout(() => {
            if (elements.bannerBackground.style.opacity == "0") {
                elements.bannerBackground.style.backgroundImage = "none";
            }
        }, 500);
    }
}
function configurarEventosHub() {
    if (!elements.genReportBtn) return;
    if (elements.btnInfo) {
        elements.btnInfo.addEventListener("click", () => {
            elements.disclaimerModal.style.display = "flex";
        });
    }
    elements.genReportBtn.addEventListener("click", () => {
        elements.formatModal.style.display = "flex";
    });
    elements.closeBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const modalId = e.currentTarget.getAttribute("data-modal");
            document.getElementById(modalId).style.display = "none";
        });
    });
    window.addEventListener("click", (e) => {
        if (e.target === elements.colorModal) elements.colorModal.style.display = "none";
        if (e.target === elements.formatModal) elements.formatModal.style.display = "none";
        if (e.target === elements.columnModal) elements.columnModal.style.display = "none";
    });
    elements.formatOptions.forEach((btn) => {
        btn.onclick = (e) => {
            selectedFormat = e.currentTarget.getAttribute("data-format");
            elements.formatModal.style.display = "none";
            elements.columnModal.style.display = "flex";
            setupColumnPicker();
        };
    });
    function setupColumnPicker() {
        const updateSelection = () => {
            chartsToInclude = [];
            elements.chartColOptions.forEach((checkbox) => {
                if (checkbox.checked) chartsToInclude.push(checkbox.getAttribute("data-list"));
            });
            elements.confirmColumnsBtn.disabled = chartsToInclude.length === 0 || chartsToInclude.length > 2;
        };
        elements.chartColOptions.forEach((checkbox) => {
            checkbox.onchange = () => {
                updateSelection();
                if (chartsToInclude.length > 2) {
                    checkbox.checked = !1;
                    updateSelection();
                }
            };
        });
        updateSelection();
    }
    elements.confirmColumnsBtn.onclick = () => {
        if (chartsToInclude.length < 1 || chartsToInclude.length > 2) return;
        elements.columnModal.style.display = "none";
        elements.colorModal.style.display = "flex";
    };
    elements.colorOptions.forEach((btn) => {
        btn.onclick = (e) => {
            elements.colorOptions.forEach((b) => b.classList.remove("selected"));
            e.currentTarget.classList.add("selected");
            selectedAccentColor = e.currentTarget.getAttribute("data-color");
            elements.colorModal.style.display = "none";
            setTimeout(() => gerarImagemFinal(selectedFormat, selectedAccentColor, chartsToInclude), 50);
        };
    });
}
async function gerarImagemFinal(format, accentColor, selectedCharts) {
    const btn = elements.genReportBtn;
    const originalText = btn.textContent;
    btn.textContent = "Generating...";
    btn.disabled = !0;
    let cardElement, cardWidth, cardHeight;
    let col1, col1Title, col1List;
    let col2, col2Title, col2List;
    if (format === "story") {
        cardElement = elements.storyCard;
        cardWidth = 1080;
        cardHeight = 1920;
        col1 = cardElement.querySelector(".story-column:nth-child(1)");
        col1Title = elements.storyCol1Title;
        col1List = elements.storyCol1List;
        col2 = cardElement.querySelector(".story-column:nth-child(2)");
        col2Title = elements.storyCol2Title;
        col2List = elements.storyCol2List;
    } else {
        cardElement = elements.squareCard;
        cardWidth = 1080;
        cardHeight = 1080;
        col1 = cardElement.querySelector(".sq-v2-column:nth-child(1)");
        col1Title = elements.sqCol1Title;
        col1List = elements.sqCol1List;
        col2 = cardElement.querySelector(".sq-v2-column:nth-child(2)");
        col2Title = elements.sqCol2Title;
        col2List = elements.sqCol2List;
    }
    if (selectedCharts.length === 1) {
        const type = selectedCharts[0];
        const data = cachedData[type] || [];
        const title = document.querySelector(`.chart-col-option[data-list="${type}"]`).getAttribute("data-title");
        col1.style.display = "flex";
        col2.style.display = "none";
        if (format === "square") col1.style.width = "100%";
        const limit = format === "story" ? 10 : 6;
        col1Title.textContent = title;
        col1List.innerHTML = formatarListaHTML(data, limit, type, format);
    } else {
        const [type1, type2] = selectedCharts;
        const data1 = cachedData[type1] || [];
        const data2 = cachedData[type2] || [];
        const title1 = document.querySelector(`.chart-col-option[data-list="${type1}"]`).getAttribute("data-title");
        const title2 = document.querySelector(`.chart-col-option[data-list="${type2}"]`).getAttribute("data-title");
        col1.style.display = "flex";
        col2.style.display = "flex";
        if (format === "square") col1.style.width = "50%";
        const limit = format === "story" ? 5 : 6;
        col1Title.textContent = title1;
        col1List.innerHTML = formatarListaHTML(data1, limit, type1, format);
        col2Title.textContent = title2;
        col2List.innerHTML = formatarListaHTML(data2, limit, type2, format);
    }
    try {
        aplicarCoresDinamicas(cardElement, accentColor, format);
        await new Promise((r) => setTimeout(r, 600));
        const canvas = await html2canvas(cardElement, {
            scale: 2,
            useCORS: !0,
            allowTaint: !0,
            backgroundColor: "#0f0f0f",
            width: cardWidth,
            height: cardHeight,
            windowWidth: cardWidth,
            windowHeight: cardHeight,
            logging: !1,
        });
        const link = document.createElement("a");
        link.download = `TuneCharts-Counter-${username}-${currentPeriod}-${format}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        btn.textContent = "Done!";
    } catch (err) {
        console.error(err);
        alert("Error generating image: " + err.message);
    } finally {
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = !1;
        }, 2000);
    }
}
function formatarListaHTML(items, limit, type, format) {
    let html = "";
    const list = items || [];
    const itemsToShow = list.slice(0, limit);
    itemsToShow.forEach((item, i) => {
        let text = item.name;
        const timeStr = formatTimeShort(item.seconds);
        if (format === "story") {
            html += `
                <div class="story-item ${i === 0 ? "top-1" : ""}">
                    <span class="story-rank">#${i + 1}</span>
                    <span class="story-text" style="flex:1;">${text}</span>
                    <span style="font-size:0.9em; opacity:0.9; margin-left:8px; white-space:nowrap;">${timeStr}</span>
                </div>
            `;
        } else {
            html += `
                <li class="${i === 0 ? "top-1" : ""}">
                    <span class="sq-v2-rank">#${i + 1}</span>
                    <div style="display:flex; justify-content:space-between; width:100%;">
                         <span class="sq-v2-text">${text}</span>
                         <span style="font-size:0.8em; opacity:0.8;">${timeStr}</span>
                    </div>
                </li>
            `;
        }
    });
    return html || "No data.";
}
function aplicarCoresDinamicas(card, accentColor, format) {
    if (format === "story") {
        card.querySelectorAll(".story-subtitle, .story-rank, .stat-label, .stat-disclaimer").forEach(
            (el) => (el.style.color = accentColor)
        );
        card.querySelectorAll(".story-column h3").forEach((el) => (el.style.borderLeftColor = accentColor));
        card.querySelectorAll(".story-stat, .story-item.top-1").forEach((el) => {
            el.style.borderColor = accentColor;
            el.style.backgroundColor = accentColor + "33";
        });
        const headerElement = card.querySelector(".story-header");
        card.style.background = `
            radial-gradient(circle 700px at top right, ${accentColor}66, transparent),
            #0f0f0f
        `;
        if (headerElement) {
            if (globalTopArtistImage) {
                headerElement.style.background = `

                    radial-gradient(circle 700px at top right, ${accentColor}66, transparent),


                    linear-gradient(to bottom, transparent 30%, rgba(15,15,15,0.2) 50%, rgba(15,15,15,0.8) 80%, #0f0f0f 100%),
                    

                    linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),


                    url('${globalTopArtistImage}') no-repeat center center / cover
                `;
            } else {
                headerElement.style.background = `radial-gradient(circle 700px at top right, ${accentColor}66, transparent)`;
            }
        }
    } else {
        card.querySelectorAll(".sq-v2-report-title, .sq-v2-list li.top-1 span, .sq-v2-stat-label").forEach(
            (el) => (el.style.color = accentColor)
        );
        card.querySelectorAll(".sq-v2-column h3").forEach((el) => (el.style.borderLeftColor = accentColor));
        card.querySelectorAll(".sq-v2-avatar").forEach((el) => (el.style.borderColor = accentColor));
        card.querySelectorAll(".sq-v2-stat, .sq-v2-list li.top-1").forEach((el) => {
            el.style.borderColor = accentColor;
            el.style.backgroundColor = accentColor + "33";
        });
        card.style.background = `radial-gradient(circle at top right, ${accentColor}66, #0f0f0f 65%)`;
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", carregarTudo);
} else {
    carregarTudo();
}
