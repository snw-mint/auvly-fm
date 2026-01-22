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
let periodOffset = 0;

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
        mainTitle: document.querySelector(".subtitulo-destaque"),
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
        chartsGrid: document.querySelector(".charts-grid"),
    };
    configurarEventosHub();
    configurarTogglePeriodo();
    configurarNavegacao();
    await buscarPerfil();
    atualizarDadosDoPeriodo(true);
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
            atualizarDadosDoPeriodo(false);
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

function configurarNavegacao() {
    const prevBtn = document.getElementById("prevPeriod");
    const nextBtn = document.getElementById("nextPeriod");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            periodOffset++;
            atualizarDadosDoPeriodo(false);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (periodOffset > 0) {
                periodOffset--;
                atualizarDadosDoPeriodo(false);
            }
        });
    }
}

function getStartOfWeekTimestamp() {
    const d = new Date();
    d.setDate(d.getDate() - (periodOffset * 7));
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
}

function getStartOfMonthTimestamp() {
    const d = new Date();
    d.setMonth(d.getMonth() - periodOffset);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
}

function getEndOfPeriodTimestamp(startTs) {
    const d = new Date(startTs * 1000);
    if (currentPeriod === "7day") {
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
    } else {
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        d.setHours(23, 59, 59, 999);
    }
    return Math.floor(d.getTime() / 1000);
}

function getMonthName(date) {
    return date.toLocaleString('en-US', { month: 'long' });
}

async function atualizarDadosDoPeriodo(isInitialLoad = false) {
    resetarChartsParaSkeleton();
    globalTopArtistImage = "";
    atualizarBanner("");
    const nextBtn = document.getElementById("nextPeriod");
    if (elements.chartsGrid) elements.chartsGrid.style.display = "grid";
    if (elements.genReportBtn) elements.genReportBtn.style.display = "flex";
    if (elements.mainTitle) {
        elements.mainTitle.textContent = "Your Top List";
        elements.mainTitle.style.opacity = "1";
    }
    if (nextBtn) {
    nextBtn.style.visibility = ""; 
    if (periodOffset === 0) {
        nextBtn.classList.add("nav-disabled");
    } else {
        nextBtn.classList.remove("nav-disabled");
    }
}

    let reportSubtitle = "";
    let labelText = "";
    let scrobblesLabel = "";
    let fromTimestamp = 0;
    let toTimestamp = 0;
    let periodNameForEmpty = "";

    const refDate = new Date();
    if (currentPeriod === "7day") {
        refDate.setDate(refDate.getDate() - (periodOffset * 7));
    } else {
        refDate.setMonth(refDate.getMonth() - periodOffset);
    }

    if (currentPeriod === "7day") {
        fromTimestamp = getStartOfWeekTimestamp();
        if (periodOffset > 0) toTimestamp = getEndOfPeriodTimestamp(fromTimestamp);
        
        const dayStr = new Date(fromTimestamp * 1000).getDate();
        const monthStr = getMonthName(new Date(fromTimestamp * 1000));
        
        reportSubtitle = `Week of ${monthStr} ${dayStr}`;
        periodNameForEmpty = "this week";
        labelText = "This week";
        scrobblesLabel = "Weekly Time";
    } else if (currentPeriod === "1month") {
        fromTimestamp = getStartOfMonthTimestamp();
        if (periodOffset > 0) toTimestamp = getEndOfPeriodTimestamp(fromTimestamp);
        
        const monthName = getMonthName(refDate);
        const year = refDate.getFullYear();
        const yearStr = year !== new Date().getFullYear() ? ` ${year}` : "";

        reportSubtitle = `My ${monthName}${yearStr}`;
        periodNameForEmpty = `in ${monthName}`;
        labelText = `In ${monthName}`;
        scrobblesLabel = "Monthly Time";
    }

    if (elements.storySubtitle) elements.storySubtitle.textContent = reportSubtitle;
    if (elements.sqReportTitle) elements.sqReportTitle.textContent = reportSubtitle;
    if (elements.storyScrobblesLabel) elements.storyScrobblesLabel.textContent = scrobblesLabel;
    if (elements.sqScrobblesLabel) elements.sqScrobblesLabel.textContent = scrobblesLabel;
    if (elements.monthlyLabel) elements.monthlyLabel.textContent = reportSubtitle;
    if (elements.storyDisclaimer) elements.storyDisclaimer.textContent = labelText;

    await processarDadosTempoCalendario(fromTimestamp, toTimestamp, periodNameForEmpty);

    if (isInitialLoad) {
        const activeButton = document.querySelector(".toggle-option.active");
        if (activeButton) setTimeout(() => moveGlider(activeButton), 100);
    }
}

async function criarDicionarioDeDuracao(periodMatch) {
    const map = {};
    try {
        const apiPeriod = periodMatch === '7day' ? '7day' : '1month';
        const url = CONFIG.counterUrl(`?method=user.gettoptracks&user=${username}&limit=1000&period=${apiPeriod}`);
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.toptracks && data.toptracks.track) {
            const list = Array.isArray(data.toptracks.track) ? data.toptracks.track : [data.toptracks.track];
            list.forEach(t => {
                const d = parseInt(t.duration);
                if (d > 0) {
                    const key = `${t.name.toLowerCase()}_||_${t.artist.name.toLowerCase()}`;
                    map[key] = d;
                }
            });
        }
    } catch (e) { console.warn("Erro duration dict", e); }
    return map;
}

async function processarDadosTempoCalendario(fromTimestamp, toTimestamp, periodName) {
    try {
        const durationPromise = criarDicionarioDeDuracao(currentPeriod);
        const historyPromise = buscarHistoricoCompleto(fromTimestamp, toTimestamp);

        const [durationMap, tracks] = await Promise.all([durationPromise, historyPromise]);

        if (tracks.length === 0) {
            tratarEstadoVazio(periodName);
            return;
        }
        
        let totalSeconds = 0;
        const artistMap = {};
        const trackMap = {};
        const albumMap = {};

        tracks.forEach(t => {
            const artistName = t.artist ? t.artist["#text"] : "Unknown";
            const trackName = t.name;
            const albumName = t.album ? t.album["#text"] : "";
            
            let duration = parseInt(t.duration || "0");
            if (duration === 0) {
                const key = `${trackName.toLowerCase()}_||_${artistName.toLowerCase()}`;
                duration = durationMap[key] || 0;
            }
            
            if (duration > 0) {
                totalSeconds += duration;
                if (!artistMap[artistName]) artistMap[artistName] = 0;
                artistMap[artistName] += duration;
                const trackKey = `${trackName}_||_${artistName}`;
                if (!trackMap[trackKey]) trackMap[trackKey] = { seconds: 0, name: trackName, artist: artistName };
                trackMap[trackKey].seconds += duration;
                if (albumName) {
                    const albumKey = `${albumName}_||_${artistName}`;
                    if (!albumMap[albumKey]) albumMap[albumKey] = { seconds: 0, name: albumName, artist: artistName };
                    albumMap[albumKey].seconds += duration;
                }
            }
        });

        const totalMinutes = Math.floor(totalSeconds / 60);
        const formattedTotal = totalMinutes.toLocaleString("en-US") + " Minutes";
        let daysDivisor = 1;
        if (toTimestamp > 0) {
             daysDivisor = (toTimestamp - fromTimestamp) / 86400;
        } else {
             daysDivisor = (Date.now()/1000 - fromTimestamp) / 86400;
        }
        daysDivisor = Math.max(1, Math.round(daysDivisor));

        const dailyAvg = Math.round(totalMinutes / daysDivisor);
        const formattedDaily = dailyAvg.toLocaleString("en-US") + " Mins/Day";

        if (elements.scrobblesPerDay) elements.scrobblesPerDay.textContent = formattedDaily;
        if (elements.userScrobbles) elements.userScrobbles.textContent = formattedTotal;
        if (elements.storyScrobblesValue) elements.storyScrobblesValue.textContent = formattedTotal;
        if (elements.sqScrobblesValue) elements.sqScrobblesValue.textContent = formattedTotal;

        const sortedArtists = Object.entries(artistMap)
            .map(([name, seconds]) => ({ name: name, seconds: seconds }))
            .sort((a, b) => b.seconds - a.seconds);

        const sortedTracks = Object.values(trackMap)
            .map(obj => ({ name: obj.name, artist: { name: obj.artist }, seconds: obj.seconds }))
            .sort((a, b) => b.seconds - a.seconds);

        const sortedAlbums = Object.values(albumMap) 
            .map(obj => ({ name: obj.name, artist: { name: obj.artist }, seconds: obj.seconds }))
            .sort((a, b) => b.seconds - a.seconds);

        cachedData.artists = sortedArtists;
        cachedData.tracks = sortedTracks;
        cachedData.albums = sortedAlbums;

        renderizarPreviewLista("cardArtists", sortedArtists, "artist");
        renderizarPreviewLista("cardTracks", sortedTracks, "track");
        renderizarPreviewLista("cardAlbums", sortedAlbums, "album");

        if (sortedArtists.length > 0) {
            const topArtistName = sortedArtists[0].name;
            buscarImagemSpotify(topArtistName, "", "artist").then((url) => {
                if (url) {
                    globalTopArtistImage = url;
                    atualizarBanner(url);
                    const top1ImgEl = document.querySelector("#cardArtists .top-1 .cover-placeholder");
                    if (top1ImgEl) {
                         top1ImgEl.innerHTML = "";
                         const img = new Image();
                         img.src = url;
                         img.style.width = "100%";
                         img.style.height = "100%";
                         img.style.objectFit = "cover";
                         img.onload = () => { top1ImgEl.appendChild(img); img.classList.add('loaded'); };
                    }
                }
            });
        }
        if (sortedTracks.length > 0) {
            const topTrack = sortedTracks[0];
            buscarImagemSpotify(topTrack.artist.name, topTrack.name, "track").then((url) => {
                if (url) {
                    const top1TrackEl = document.querySelector("#cardTracks .top-1 .cover-placeholder");
                    if (top1TrackEl) {
                        top1TrackEl.innerHTML = "";
                        const img = new Image();
                        img.src = url;
                        img.style.width = "100%";
                        img.style.height = "100%";
                        img.style.objectFit = "cover";
                        img.onload = () => { top1TrackEl.appendChild(img); img.classList.add('loaded'); };
                    }
                }
            });
        }
        
        if (sortedAlbums.length > 0) {
            const topAlbum = sortedAlbums[0];
            buscarImagemSpotify(topAlbum.artist.name, topAlbum.name, "album").then((url) => {
                if (url) {
                    const top1AlbumEl = document.querySelector("#cardAlbums .top-1 .cover-placeholder");
                    if (top1AlbumEl) {
                        top1AlbumEl.innerHTML = "";
                        const img = new Image();
                        img.src = url;
                        img.style.width = "100%"; img.style.height = "100%"; img.style.objectFit = "cover";
                        img.onload = () => { top1AlbumEl.appendChild(img); img.classList.add('loaded'); };
                    }
                }
            });
        }

    } catch (error) {
        console.error("Erro calculando tempo:", error);
        if (elements.userScrobbles) elements.userScrobbles.textContent = "Error";
        document.querySelectorAll(".lista-top").forEach((el) => (el.innerHTML = "Error loading."));
    } finally {
        if (elements.userScrobbles) elements.userScrobbles.classList.remove("skeleton");
        if (elements.scrobblesPerDay) elements.scrobblesPerDay.classList.remove("skeleton");
    }
}

function tratarEstadoVazio(periodName) {
    if (elements.chartsGrid) elements.chartsGrid.style.display = "none";
    if (elements.genReportBtn) elements.genReportBtn.style.display = "none";

    if (elements.mainTitle) {
        elements.mainTitle.textContent = "Oops, nothing here yet.";
        elements.mainTitle.style.opacity = "0.7";
    }
    if (elements.monthlyLabel) {
        elements.monthlyLabel.textContent = `You haven't listened to anything ${periodName} yet. Come back later!`;
        elements.monthlyLabel.style.color = "#bb86fc";
    }

    if (elements.userScrobbles) { elements.userScrobbles.textContent = "0 Minutes"; elements.userScrobbles.classList.remove("skeleton"); }
    if (elements.scrobblesPerDay) { elements.scrobblesPerDay.textContent = "0 Mins/Day"; elements.scrobblesPerDay.classList.remove("skeleton"); }
    
    atualizarBanner("");
}

async function buscarHistoricoCompleto(fromTimestamp, toTimestamp = 0) {
    let allTracks = [];
    let page = 1;
    let totalPages = 1;
    const limit = 200; 
    const toParam = toTimestamp > 0 ? `&to=${toTimestamp}` : "";

    try {
        do {
            const url = CONFIG.counterUrl(`?method=user.getrecenttracks&user=${username}&limit=${limit}&page=${page}&from=${fromTimestamp}${toParam}&_t=${Date.now()}`);
            const res = await fetch(url);
            const data = await res.json();

            if (!data.recenttracks || !data.recenttracks.track) break;

            const tracks = Array.isArray(data.recenttracks.track) 
                ? data.recenttracks.track 
                : [data.recenttracks.track];
            
            allTracks = allTracks.concat(tracks.filter(t => t.date)); 

            if (data.recenttracks["@attr"]) {
                totalPages = parseInt(data.recenttracks["@attr"].totalPages);
            }
            page++;
        } while (page <= totalPages);
    } catch (e) { console.error("Erro fetch historico", e); }
    return allTracks;
}

function resetarChartsParaSkeleton() {
    const skeletonTop1 = `
        <div class="chart-item skeleton top-1">
            <div class="cover-placeholder" style="background: #333; width: 50px; height: 50px; border-radius: 4px; flex-shrink: 0;"></div>
            <span class="skeleton-text" style="width: 60%;"></span>
        </div>`;
    const skeletonItem = `<div class="chart-item skeleton"></div>`;
    document.querySelectorAll(".lista-top").forEach((el) => {
        el.innerHTML = skeletonTop1 + skeletonItem.repeat(9);
    });
    if (elements.userScrobbles) elements.userScrobbles.innerHTML = "loading...";
    if (elements.scrobblesPerDay) elements.scrobblesPerDay.innerHTML = "loading...";
}

async function obterTokenSpotify() {
    if (spotifyTokenCache) return spotifyTokenCache;
    try {
        const res = await fetch(CONFIG.counterUrl("spotify-token"));
        const data = await res.json();
        if (data.access_token) {
            spotifyTokenCache = data.access_token;
            return data.access_token;
        }
    } catch (e) { console.warn("Falha token Spotify:", e); }
    return null;
}

async function buscarImagemSpotify(artist, albumOrTrackName, type) {
    const token = await obterTokenSpotify();
    if (!token) return null;

    const cleanArtist = artist.replace(/"/g, ''); 
    const cleanTrack = albumOrTrackName ? albumOrTrackName.split(" - ")[0].split("(")[0].trim() : "";

    let searchQuery = "";
    let searchType = "";

    if (type === "artist") {
        searchQuery = `artist:${cleanArtist}`;
        searchType = "artist";
    } else if (type === "album") {
        searchQuery = `album:${cleanTrack} artist:${cleanArtist}`;
        searchType = "album";
    } else {
        searchQuery = `track:${cleanTrack} artist:${cleanArtist}`;
        searchType = "track";
    }

    try {
        const qEncoded = encodeURIComponent(searchQuery);
        const url = `https://api.spotify.com/v1/search?q=${qEncoded}&type=${searchType}&limit=1`;
        const res = await fetch(url, {
            headers: { 
                "Authorization": `Bearer ${token}` 
            }
        });

        if (!res.ok) {
            console.warn(`Erro Spotify [${res.status}]:`, await res.text());
            return null;
        }

        const data = await res.json();

        if (type === "artist" && data.artists?.items?.length > 0) {
            return data.artists.items[0].images[0]?.url;
        } else if (type === "album" && data.albums?.items?.length > 0) {
            return data.albums.items[0].images[0]?.url;
        } else if (type === "track" && data.tracks?.items?.length > 0) {
            return data.tracks.items[0].album.images[0]?.url;
        }
    } catch (e) {
        console.error("Erro no fetch do Spotify:", e);
        return null;
    }
    return null;
}

async function buscarPerfil() {
    try {
        const url = CONFIG.counterUrl(`?method=user.getinfo&user=${username}`);
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

function renderizarPreviewLista(elementId, dataList, type) {
    const mainItems = dataList.slice(0, 10);
    const container = document.querySelector(`#${elementId} .lista-top`);
    if (!container) return;
    
    let htmlMain = "";
    
    mainItems.forEach((item, i) => {
        const isTop1 = i === 0;
        let text = item.name;
        
        // --- CORREÇÃO AQUI: Definimos a variável timeStr antes de usar ---
        const timeStr = formatTimeShort(item.seconds);
        // ----------------------------------------------------------------

        let subtext = "";
        if (type === "track" || type === "album") {
            subtext = `<span style="opacity:0.6"> - ${item.artist.name}</span>`;
        }
        
        const imgId = `img-${type}-${i}`;
        
        if (isTop1) {
            htmlMain += `
            <div class="chart-item top-1">
                <div id="${imgId}" class="cover-placeholder" style="width: 50px; height: 50px; flex-shrink: 0; border-radius: 4px; overflow: hidden; background: #333; margin-right: 12px;"></div>
                <div class="text-content" style="min-width: 0; flex: 1;">
                    <span class="rank-number">#1</span>
                    <div style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <span style="white-space: nowrap;">${text}</span>${subtext}
                        <span style="display:block; font-size: 0.85em; opacity: 0.8; margin-top: 2px;">${timeStr}</span>
                    </div>
                </div>
            </div>`;
        } else {
            htmlMain += `
            <div class="chart-item" style="display: flex; justify-content: space-between; gap: 10px;">
                <div style="flex:1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    #${i + 1} - ${text}${subtext}
                </div>
                <div style="font-size:0.85em; opacity:0.8; flex-shrink: 0;">${timeStr}</div>
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
        const limit = format === "story" ? 10 : 5;
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
        const limit = format === "story" ? 5 : 5;
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
        
        if (format === "story") {
            const isTop1 = i === 0;
            const rankClass = isTop1 ? "top-1" : "";

            let timeStr = formatTimeShort(item.seconds); 
            timeStr = timeStr.replace('m', '') + ' mins'; 

            html += `
                <div class="story-item ${rankClass}">
                    <span class="story-rank">${i + 1}</span>
                    <div class="story-item-content">
                        <span class="story-text">${text}</span>
                        <span class="story-meta">${timeStr}</span>
                    </div>
                </div>
            `;
        } else {
            html += `
                <li class="${i === 0 ? "top-1" : ""}" style="display: flex; align-items: center;">
                    <span class="sq-v2-rank" style="flex-shrink: 0;">#${i + 1}</span>
                    <span class="sq-v2-text" style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${text}</span>
                </li>
            `;
        }
    });
    return html || "No data.";
}

function aplicarCoresDinamicas(card, accentColor, format) {
    if (format === "story") {
        card.querySelectorAll(".story-subtitle, .story-username, .footer-stat-label, .story-rank").forEach(
            (el) => (el.style.color = accentColor)
        );
        
        card.querySelectorAll(".story-column h3").forEach(
            (el) => (el.style.borderLeftColor = accentColor)
        );

        const separator = card.querySelector(".story-separator");
        if (separator) {
            separator.style.backgroundColor = accentColor;
            separator.style.boxShadow = `0 0 20px ${accentColor}99`; 
        }

        const headerElement = card.querySelector(".story-header");
        if (headerElement) {
            if (globalTopArtistImage) {
                headerElement.style.backgroundImage = `
                    radial-gradient(circle at center, transparent 0%, #0f0f0f 120%),
                    url('${globalTopArtistImage}')
                `;
            } else {

                headerElement.style.background = `radial-gradient(circle at center, ${accentColor}44, #0f0f0f)`;
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

document.addEventListener("DOMContentLoaded", () => {
    const prevBtn = document.getElementById("prevPeriod");
    const nextBtn = document.getElementById("nextPeriod");
    const label = document.querySelector(".monthly-label");
    function animateLabel(direction) {
        if (!label) return;
        label.classList.remove("animating-left", "animating-right");
        void label.offsetWidth;
        if (direction === "prev") {
            label.classList.add("animating-left");
        } else {
            label.classList.add("animating-right");
        }
        setTimeout(() => {
            label.classList.remove("animating-left", "animating-right");
        }, 400);
    }
    if (prevBtn) {
        prevBtn.addEventListener("click", () => animateLabel("prev"));
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", () => animateLabel("next"));
    }
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", carregarTudo);
} else {
    carregarTudo();
}