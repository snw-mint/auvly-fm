const params = new URLSearchParams(window.location.search);
const username = params.get("user");
const iconDownload = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M3 15c0 2.828 0 4.243.879 5.121C4.757 21 6.172 21 9 21h6c2.828 0 4.243 0 5.121-.879C21 19.243 21 17.828 21 15M12 3v13m0 0 4-4.375M12 16l-4-4.375"/></svg>`;
const iconCheck = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const iconLoading = `<svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;

if (!username) window.location.href = "index.html";

let currentPeriod = "1month"; 
let selectedAccentColor = "#bb86fc";
let selectedFormat = "story";
let chartsToInclude = ["artists", "tracks"];
let elements = {};
let globalTopArtistImage = "";
let cachedData = { artists: [], tracks: [], albums: [] };
let spotifyTokenCache = null;
let periodOffset = 0;

async function carregarTudo() {
    elements = {
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
    atualizarDadosDoPeriodo(true);
    configurarNavegacao();
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
        labelText = "This week";
        scrobblesLabel = "Weekly Scrobbles";
    } else if (currentPeriod === "1month") {
        fromTimestamp = getStartOfMonthTimestamp();
        if (periodOffset > 0) toTimestamp = getEndOfPeriodTimestamp(fromTimestamp);

        const monthName = getMonthName(refDate);
        const year = refDate.getFullYear();
        const yearStr = year !== new Date().getFullYear() ? ` ${year}` : "";
        
        reportSubtitle = `My ${monthName}${yearStr}`;
        labelText = `In ${monthName}`;
        scrobblesLabel = "Monthly Scrobbles";
    }

    elements.storySubtitle.textContent = reportSubtitle;
    elements.sqReportTitle.textContent = reportSubtitle;
    elements.storyScrobblesLabel.textContent = scrobblesLabel;
    elements.sqScrobblesLabel.textContent = scrobblesLabel;
    if (elements.monthlyLabel) elements.monthlyLabel.textContent = reportSubtitle; 
    if (elements.storyDisclaimer) elements.storyDisclaimer.textContent = labelText;

    await processarDadosCalendario(fromTimestamp, toTimestamp);

    if (isInitialLoad) {
        const activeButton = document.querySelector(".toggle-option.active");
        if (activeButton) setTimeout(() => moveGlider(activeButton), 100);
    }
}

async function processarDadosCalendario(fromTimestamp, toTimestamp) { 
    try {
        const tracks = await buscarHistoricoCompleto(fromTimestamp, toTimestamp);
        
        const totalScrobbles = tracks.length;
        elements.userScrobbles.textContent = totalScrobbles.toLocaleString("pt-BR");
        if (elements.storyScrobblesValue) elements.storyScrobblesValue.textContent = totalScrobbles.toLocaleString("en-US");
        if (elements.sqScrobblesValue) elements.sqScrobblesValue.textContent = totalScrobbles.toLocaleString("en-US");
        let daysDivisor = 1;
        if (toTimestamp > 0) {
             daysDivisor = (toTimestamp - fromTimestamp) / 86400;
        } else {
             daysDivisor = (Date.now()/1000 - fromTimestamp) / 86400;
        }
        daysDivisor = Math.max(1, Math.round(daysDivisor));
        
        const dailyAvg = Math.round(totalScrobbles / daysDivisor);
        if (elements.scrobblesPerDay) elements.scrobblesPerDay.textContent = dailyAvg.toLocaleString("pt-BR");

        const artistMap = {};
        const trackMap = {};
        const albumMap = {};

        tracks.forEach(t => {
            const artistName = t.artist ? t.artist["#text"] : "Unknown";
            const trackName = t.name;
            const albumName = t.album ? t.album["#text"] : "";

            if (!artistMap[artistName]) artistMap[artistName] = 0;
            artistMap[artistName]++;

            const trackKey = `${trackName}_||_${artistName}`;
            if (!trackMap[trackKey]) trackMap[trackKey] = { count: 0, name: trackName, artist: artistName };
            trackMap[trackKey].count++;

            if (albumName) {
                const albumKey = `${albumName}_||_${artistName}`;
                if (!albumMap[albumKey]) albumMap[albumKey] = { count: 0, name: albumName, artist: artistName };
                albumMap[albumKey].count++;
            }
        });

        const sortedArtists = Object.entries(artistMap)
            .map(([name, count]) => ({ name: name, playcount: count }))
            .sort((a, b) => b.playcount - a.playcount);

        const sortedTracks = Object.values(trackMap)
            .map(obj => ({ name: obj.name, artist: { name: obj.artist }, playcount: obj.count }))
            .sort((a, b) => b.playcount - a.playcount);
            
        const sortedAlbums = Object.values(albumMap)
            .map(obj => ({ name: obj.name, artist: { name: obj.artist }, playcount: obj.count }))
            .sort((a, b) => b.playcount - a.playcount);

        cachedData.artists = sortedArtists;
        cachedData.tracks = sortedTracks;
        cachedData.albums = sortedAlbums;

        renderizarListaProcessada("cardArtists", sortedArtists, "artist");
        renderizarListaProcessada("cardTracks", sortedTracks, "track");
        renderizarListaProcessada("cardAlbums", sortedAlbums, "album");

    } catch (error) {
        console.error("Erro processando calendario:", error);
        elements.userScrobbles.textContent = "-";
        document.querySelectorAll(".lista-top").forEach(el => el.innerHTML = "Error loading.");
    } finally {
        elements.userScrobbles.classList.remove("skeleton");
        if (elements.scrobblesPerDay) elements.scrobblesPerDay.classList.remove("skeleton");
    }
}
async function buscarHistoricoCompleto(fromTimestamp, toTimestamp = 0) {
    let allTracks = [];
    let page = 1;
    let totalPages = 1;
    const limit = 200;
    const toParam = toTimestamp > 0 ? `&to=${toTimestamp}` : "";

    try {
        do {
           const url = CONFIG.apiUrl(`?method=user.getrecenttracks&user=${username}&limit=${limit}&page=${page}&from=${fromTimestamp}${toParam}&_t=${Date.now()}`);
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

    } catch (e) {
        console.error("Erro fetch historico", e);
    }
    return allTracks;
}

function renderizarListaProcessada(elementId, items, type) {
    const container = document.querySelector(`#${elementId} .lista-top`);
    if (!container) return;

    let htmlMain = "";
    const topItems = items.slice(0, 10);

    topItems.forEach((item, i) => {
        const isTop1 = i === 0;
        let text = item.name;
        let artistName = item.artist ? item.artist.name : ""; 
        

        const artistForSearch = type === "artist" ? item.name : artistName;
        const trackForSearch = type === "artist" ? "" : item.name;

        const imgId = `img-${type}-${i}`;

        if (isTop1) {
            let subtitle = type !== "artist" ? `<span style="display:block; font-size: 0.85em; opacity: 0.7; font-weight: normal;">${artistName}</span>` : "";

            let countLabel = `<span style="display:block; font-size: 0.75em; opacity: 0.6; margin-top: 4px;">${item.playcount} plays</span>`;

            htmlMain += `<div class="chart-item top-1"><div id="${imgId}" class="cover-placeholder"></div><div class="text-content"><span class="rank-number">#1</span><div><span>${text}</span>${subtitle}${countLabel}</div></div></div>`;
            

            buscarImagemSpotify(artistForSearch, trackForSearch, type).then(
                (spotifyUrl) => {
                    if (spotifyUrl) {
                        const el = document.getElementById(imgId);
                        if (el) {
                            const img = new Image();
                            img.src = spotifyUrl;
                            img.onload = () => {
                                el.innerHTML = "";
                                el.appendChild(img);
                                void el.offsetWidth; 
                                img.classList.add('loaded');
                            };
                        }
                        if (type === "artist") {
                            atualizarBanner(spotifyUrl);
                            globalTopArtistImage = spotifyUrl;
                        }
                    }
                }
            );
        } else {
            let extra = type !== "artist" ? ` <span style="opacity:0.6"> - ${artistName}</span>` : "";

            htmlMain += `<div class="chart-item" style="display: flex; justify-content: space-between; gap: 10px;">
                            <div style="flex:1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                #${i + 1} - ${text}${extra}
                            </div>
                            <div style="font-size:0.8em; opacity:0.5; flex-shrink: 0;">
                                ${item.playcount}
                            </div>
                         </div>`;
        }
    });

    container.innerHTML = htmlMain || "No data for this period.";
}

function resetarChartsParaSkeleton() {
    const skeletonTop1 = `<div class="chart-item skeleton top-1"><div class="cover-placeholder" style="background: #333;"></div><span class="skeleton-text" style="width: 60%;"></span></div>`;
    const skeletonItem = `<div class="chart-item skeleton"></div>`;
    document.querySelectorAll(".lista-top").forEach((el) => {
        el.innerHTML = skeletonTop1 + skeletonItem.repeat(9);
    });

    if (elements.userScrobbles) elements.userScrobbles.textContent = "loading";
    if (elements.scrobblesPerDay) elements.scrobblesPerDay.textContent = "loading";
}

async function buscarPerfil() {
    try {
        const url = CONFIG.apiUrl(`?method=user.getinfo&user=${username}`);
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

async function obterTokenSpotify() {
    if (spotifyTokenCache) return spotifyTokenCache;
    try {
        const res = await fetch(CONFIG.apiUrl("spotify-token"));
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

async function buscarImagemSpotify(artist, albumOrTrackName, type) {
    const token = await obterTokenSpotify();
    if (!token) return null;
    const cleanArtist = encodeURIComponent(artist);
    const cleanTrack = encodeURIComponent(albumOrTrackName.split(" - ")[0].split("(")[0]);
    let query = "";
    let searchType = "";
    if (type === "artist") {
        query = `q=artist:"${cleanArtist}"`;
        searchType = "artist";
    } else if (type === "album") {
        query = `q=album:"${cleanTrack}" artist:"${cleanArtist}"`;
        searchType = "album";
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
        } else if (type === "album" && data.albums?.items?.length > 0) {
            return data.albums.items[0].images[0]?.url;
        } else if (type === "track" && data.tracks?.items?.length > 0) {
            return data.tracks.items[0].album.images[0]?.url;
        }
    } catch (e) {
        return null;
    }
    return null;
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
    elements.genReportBtn.addEventListener("click", () => elements.formatModal.style.display = "flex");
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
                if (chartsToInclude.length > 2) { checkbox.checked = false; updateSelection(); }
            };
        });
        updateSelection();
    }
    elements.confirmColumnsBtn.onclick = () => {
        if (chartsToInclude.length >= 1 && chartsToInclude.length <= 2) {
            elements.columnModal.style.display = "none";
            elements.colorModal.style.display = "flex";
        }
    };
    elements.colorOptions.forEach((btn) => {
        btn.onclick = (e) => {
            selectedAccentColor = e.currentTarget.getAttribute("data-color");
            elements.colorModal.style.display = "none";
            setTimeout(() => gerarImagemFinal(selectedFormat, selectedAccentColor, chartsToInclude), 50);
        };
    });
}

function configurarNavegacao() {
    const prevBtn = document.getElementById("prevPeriod");
    const nextBtn = document.getElementById("nextPeriod");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            periodOffset++; // Volta pro passado
            atualizarDadosDoPeriodo(false);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (periodOffset > 0) {
                periodOffset--; // Vai pro futuro (se não for 0)
                atualizarDadosDoPeriodo(false);
            }
        });
    }
}

async function gerarImagemFinal(format, accentColor, selectedCharts) {
    const btn = elements.genReportBtn;
    btn.innerHTML = `${iconLoading} Generating...`;
    btn.disabled = true;

    let cardElement, cardWidth, cardHeight, col1, col1Title, col1List, col2, col2Title, col2List;
    if (format === "story") {
        cardElement = elements.storyCard; cardWidth = 1080; cardHeight = 1920;
        col1 = cardElement.querySelector(".story-column:nth-child(1)"); col1Title = elements.storyCol1Title; col1List = elements.storyCol1List;
        col2 = cardElement.querySelector(".story-column:nth-child(2)"); col2Title = elements.storyCol2Title; col2List = elements.storyCol2List;
    } else {
        cardElement = elements.squareCard; cardWidth = 1080; cardHeight = 1080;
        col1 = cardElement.querySelector(".sq-v2-column:nth-child(1)"); col1Title = elements.sqCol1Title; col1List = elements.sqCol1List;
        col2 = cardElement.querySelector(".sq-v2-column:nth-child(2)"); col2Title = elements.sqCol2Title; col2List = elements.sqCol2List;
    }

    if (selectedCharts.length === 1) {
        const type = selectedCharts[0];
        const data = cachedData[type] || [];
        const title = document.querySelector(`.chart-col-option[data-list="${type}"]`).getAttribute("data-title");
        col1.style.display = "flex"; col2.style.display = "none";
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
        col1.style.display = "flex"; col2.style.display = "flex";
        if (format === "square") col1.style.width = "50%";
        const limit = format === "story" ? 5 : 5; 
        col1Title.textContent = title1; col1List.innerHTML = formatarListaHTML(data1, limit, type1, format);
        col2Title.textContent = title2; col2List.innerHTML = formatarListaHTML(data2, limit, type2, format);
    }

    try {
        aplicarCoresDinamicas(cardElement, accentColor, format);
        await new Promise((r) => setTimeout(r, 600));
        const canvas = await html2canvas(cardElement, {
            scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#0f0f0f",
            width: cardWidth, height: cardHeight, logging: false,
        });
        const link = document.createElement("a");
        link.download = `TuneCharts-${username}-${currentPeriod}-${format}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        btn.innerHTML = `${iconCheck} Done!`;
        btn.style.backgroundColor = "#28a745";
    } catch (err) {
        alert("Error generating image: " + err.message);
    } finally {
        setTimeout(() => {
            btn.innerHTML = `${iconDownload} Generate Report`;
            btn.disabled = false;
            btn.style.backgroundColor = "";
        }, 3000);
    }
}

function formatarListaHTML(items, limit, type, format) {
    let html = "";
    const itemsToShow = (items || []).slice(0, limit);
    itemsToShow.forEach((item, i) => {
        let text = item.name;
        
        if (format === "story") {
            const scrobbles = item.playcount ? parseInt(item.playcount).toLocaleString("en-US") : "";
  
            html += `<div class="story-item ${i === 0 ? "top-1" : ""}" style="display: flex; align-items: center;">
                        <span class="story-rank" style="flex-shrink: 0;">#${i + 1}</span>
                        <span class="story-text" style="flex:1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 15px;">${text}</span>
                        <span style="font-size:0.9em; opacity:0.9; white-space:nowrap; flex-shrink: 0;">${scrobbles} scrobbles</span>
                     </div>`;
        } else {
            html += `<li class="${i === 0 ? "top-1" : ""}" style="display: flex; align-items: center;">
                        <span class="sq-v2-rank" style="flex-shrink: 0;">#${i + 1}</span>
                        <span class="sq-v2-text" style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${text}</span>
                     </li>`;
        }
    });
    return html || "No data.";
}

function aplicarCoresDinamicas(card, accentColor, format) {
    if (format === "story") {
        card.querySelectorAll(".story-subtitle, .story-rank, .stat-label, .stat-disclaimer").forEach(el => el.style.color = accentColor);
        card.querySelectorAll(".story-column h3").forEach(el => el.style.borderLeftColor = accentColor);
        card.querySelectorAll(".story-stat, .story-item.top-1").forEach(el => { el.style.borderColor = accentColor; el.style.backgroundColor = accentColor + "33"; });
        
        const headerElement = card.querySelector(".story-header");
        if (headerElement) {
            if (globalTopArtistImage) {
                 headerElement.style.background = `
                    radial-gradient(circle 700px at top right, ${accentColor}66, transparent),
                    linear-gradient(to bottom, transparent 0%, rgba(15,15,15,0.2) 30%, rgba(15,15,15,0.8) 80%, #0f0f0f 100%),
                    linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
                    url('${globalTopArtistImage}') no-repeat center center / cover
                `;
            } else {
                 headerElement.style.background = `radial-gradient(circle 100px at top right, ${accentColor}66, transparent)`;
            }
        }
        
        card.style.background = `radial-gradient(circle 100px at top right, ${accentColor}66, transparent), #0f0f0f`;

    } else {
        card.querySelectorAll(".sq-v2-report-title, .sq-v2-list li.top-1 span, .sq-v2-stat-label").forEach(el => el.style.color = accentColor);
        card.querySelectorAll(".sq-v2-column h3").forEach(el => el.style.borderLeftColor = accentColor);
        card.querySelectorAll(".sq-v2-avatar, .sq-v2-stat, .sq-v2-list li.top-1").forEach(el => { el.style.borderColor = accentColor; if(!el.classList.contains('sq-v2-avatar')) el.style.backgroundColor = accentColor + "33"; });
        card.style.background = `radial-gradient(circle at top right, ${accentColor}66, #0f0f0f 25%)`;
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


if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", carregarTudo);
else carregarTudo();