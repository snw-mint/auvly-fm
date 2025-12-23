/* =========================================
   CONFIGURAÇÃO E CONSTANTES GLOBAIS
   ========================================= */
const params = new URLSearchParams(window.location.search);
const user1 = params.get("user1");
const user2 = params.get("user2");

// Redireciona se faltar algum usuário
if (!user1 || !user2) window.location.href = "index.html";

// Ícones SVG para botões
const iconDownload = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="m8 12 4 4m0 0 4-4m-4 4V4M4 20h16"/></svg>`;
const iconCheck = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const iconLoading = `<svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;

// Cache e Estado
let spotifyTokenCache = null;
let globalTopCommonImage = ""; 
let selectedAccentColor = "#bb86fc";
let selectedFormat = "story"; 
let isGenerating = false;

// Variáveis para guardar os nomes reais e usar no card Square
let globalDisplayName1 = "";
let globalDisplayName2 = "";

/* =========================================
   INICIALIZAÇÃO (MAIN FLOW)
   ========================================= */
async function init() {
    console.log(`Starting Match: ${user1} vs ${user2}`);
    
    setupUIEvents();

    try {
        const [u1Profile, u2Profile, u1Artists, u2Artists] = await Promise.all([
            fetchLastFm("user.getinfo", user1),
            fetchLastFm("user.getinfo", user2),
            fetchLastFm("user.gettopartists", user1, "1month", 50), 
            fetchLastFm("user.gettopartists", user2, "1month", 50)
        ]);

        renderProfiles(u1Profile, u2Profile);
        renderScrobbles(u1Profile, u2Profile);

        const matchResult = calculateCompatibility(u1Artists, u2Artists);

        renderLists(matchResult, u1Artists, u2Artists);
        updateScoreUI(matchResult.score);
        loadImages(matchResult.commonArtists, u1Artists, u2Artists);

    } catch (error) {
        console.error("Erro crítico:", error);
        alert("Ops! Could not load data. Check if usernames are correct.");
        window.location.href = "index.html";
    }
}

/* =========================================
   LÓGICA DE DADOS (FETCH & MATCH)
   ========================================= */

async function fetchLastFm(method, user, period = "", limit = "") {
    let url = `/api/?method=${method}&user=${user}`;
    if (period) url += `&period=${period}`;
    if (limit) url += `&limit=${limit}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) throw new Error(data.message);
    
    if (method === "user.gettopartists") {
        return data.topartists.artist || [];
    }
    return data; 
}

function calculateCompatibility(list1, list2) {
    const arr1 = Array.isArray(list1) ? list1 : [list1];
    const arr2 = Array.isArray(list2) ? list2 : [list2];

    let commonArtists = [];
    let score = 0;

    const map2 = new Map();
    arr2.forEach((artist, index) => map2.set(artist.name.toLowerCase(), index));

    arr1.forEach((artist, index1) => {
        const name = artist.name.toLowerCase();
        if (map2.has(name)) {
            const index2 = map2.get(name);
            const weight1 = Math.max(0, 50 - index1);
            const weight2 = Math.max(0, 50 - index2);
            const matchQuality = (weight1 + weight2) / 2; 
            
            commonArtists.push({
                name: artist.name,
                rank1: index1 + 1,
                rank2: index2 + 1,
                quality: matchQuality
            });
        }
    });

    commonArtists.sort((a, b) => b.quality - a.quality);

    const baseScore = (commonArtists.length / 50) * 100; 
    const qualityScore = commonArtists.reduce((acc, curr) => acc + curr.quality, 0) / 10; 
    
    let finalScore = Math.min(100, Math.round(baseScore * 0.4 + qualityScore * 0.6));
    
    if (commonArtists.length > 0 && commonArtists[0].rank1 === 1 && commonArtists[0].rank2 === 1) {
        finalScore = Math.min(100, finalScore + 10);
    }
    if (commonArtists.length === 0) finalScore = Math.max(0, finalScore - 10);

    return { score: finalScore, commonArtists };
}

/* =========================================
   RENDERIZAÇÃO (DOM)
   ========================================= */

function renderProfiles(p1, p2) {
    const u1 = p1.user;
    const u2 = p2.user;

    // Salva nomes globais para usar no Card Quadrado depois
    globalDisplayName1 = u1.realname || u1.name;
    globalDisplayName2 = u2.realname || u2.name;

    const getImg = (u) => (u.image.find(i => i.size === "extralarge") || u.image[0])["#text"] || "";

    // DOM Visível
    document.getElementById("userName1").textContent = globalDisplayName1;
    document.getElementById("userFoto1").src = getImg(u1);
    document.getElementById("userName2").textContent = globalDisplayName2;
    document.getElementById("userFoto2").src = getImg(u2);
    
    document.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));

    // DOM Cards Ocultos
    const hiddenIds = ["story", "sq"];
    hiddenIds.forEach(prefix => {
        document.getElementById(`${prefix}UserName1`).textContent = globalDisplayName1;
        document.getElementById(`${prefix}UserImg1`).src = getImg(u1);
        document.getElementById(`${prefix}UserName2`).textContent = globalDisplayName2;
        document.getElementById(`${prefix}UserImg2`).src = getImg(u2);
        
        document.getElementById(`${prefix}UserImg1`).crossOrigin = "anonymous";
        document.getElementById(`${prefix}UserImg2`).crossOrigin = "anonymous";
    });
}

function renderScrobbles(p1, p2) {
    const s1 = parseInt(p1.user.playcount).toLocaleString("pt-BR");
    const s2 = parseInt(p2.user.playcount).toLocaleString("pt-BR");
    document.getElementById("userScrobbles1").textContent = s1;
    document.getElementById("userScrobbles2").textContent = s2;
}

function updateScoreUI(score) {
    const scoreEl = document.getElementById("compatibilityScore");
    const vsScoreEl = document.getElementById("vsScoreTag"); // NOVO ALVO DO SCORE
    
    let current = 0;
    const interval = setInterval(() => {
        current += 2;
        if (current >= score) {
            current = score;
            clearInterval(interval);
        }
        if(scoreEl) scoreEl.textContent = current;
        if(vsScoreEl) vsScoreEl.textContent = current + "%"; 
    }, 20);

    let text = "Stranger Vibes";
    if (score > 30) text = "Musical Acquaintances";
    if (score > 50) text = "Vibe Buddies";
    if (score > 70) text = "Sonic Soulmates";
    if (score > 90) text = "A Perfect Match!";
    
    const commonContent = document.getElementById("commonContent");
    if(commonContent) commonContent.textContent = text;
    
    const storyText = document.getElementById("storySharedText");
    if(storyText) storyText.textContent = text;

    document.getElementById("storyScoreValue").textContent = score + "%";
    document.getElementById("sqScoreValue").textContent = score + "%";
}

function renderLists(matchData, list1, list2) {
    fillColumn("cardUser1", list1, false); 
    fillHiddenColumn("storyList1", list1, "story"); 
    fillHiddenColumn("sqCol1List", list1, "square"); 

    fillColumn("cardUser2", list2, false);
    fillHiddenColumn("storyList2", list2, "story");
    fillHiddenColumn("sqCol2List", list2, "square");

    if (matchData.commonArtists.length === 0) {
        document.querySelector("#cardShared .lista-top").innerHTML = "<div style='padding:20px; text-align:center; color:#666;'>No common artists found in Top 50.</div>";
    } else {
        fillColumn("cardShared", matchData.commonArtists, true);
    }
}

function fillColumn(cardId, items, isShared) {
    const container = document.querySelector(`#${cardId} .lista-top`);
    if (!container) return;
    
    let html = "";
    
    // LOOP FORÇADO DE 5 ITENS (Para preencher vazio se precisar)
    for (let i = 0; i < 5; i++) {
        const item = items[i]; // Pode ser undefined se não tiver match suficiente
        const isTop1 = i === 0;
        
        // Se item existe usa o nome, se não usa placeholder
        const name = item ? item.name : "---"; 
        const rankDisplay = `#${i + 1}`; // Sempre mostra o Rank
        
        if (isTop1) {
            // Se for Top 1 e existir dado
            if (item) {
                const imgId = `img-${cardId}-0`;
                html += `
                <div class="chart-item top-1">
                    <div id="${imgId}" class="cover-placeholder"></div>
                    <div class="text-content">
                        <span class="rank-number">#1</span>
                        <div><span>${name}</span></div>
                    </div>
                </div>`;
            } else {
                 // Top 1 vazio (caso muito raro de 0 matches)
                 html += `
                <div class="chart-item top-1">
                    <div class="cover-placeholder" style="background:#222"></div>
                    <div class="text-content"><div><span>No Data</span></div></div>
                </div>`;
            }
        } else {
            // Itens 2 a 5 (Comuns ou Normais)
            const cssClass = item ? "chart-item" : "chart-item skeleton"; // skeleton visual para vazio
            const style = item ? "" : "opacity: 0.3;"; // Deixa apagadinho se for vazio
            html += `<div class="${cssClass}" style="${style}">${rankDisplay} ${name}</div>`;
        }
    }

    container.innerHTML = html;
}

function fillHiddenColumn(elementId, items, format) {
    const container = document.getElementById(elementId);
    if (!container) return;

    let html = "";
    
    // LOOP FORÇADO DE 5 ITENS
    for (let i = 0; i < 5; i++) {
        const item = items[i];
        const rank = i + 1;
        const name = item ? item.name : "---";
        const isEmpty = !item;

        if (format === "story") {
            // Estilo Story
            html += `
            <div class="story-item ${i === 0 ? 'top-1' : ''}" style="${isEmpty ? 'opacity:0.4' : ''}">
                <span class="story-rank">#${rank}</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${name}</span>
            </div>`;
        } else {
            // Estilo Square (ul > li)
            html += `
            <li class="${i === 0 ? 'top-1' : ''}" style="${isEmpty ? 'opacity:0.4' : ''}">
                <span class="sq-v2-rank">#${rank}</span>
                <span class="sq-v2-text">${name}</span>
            </li>`;
        }
    }

    container.innerHTML = html;
}

/* =========================================
   IMAGENS & SPOTIFY
   ========================================= */

async function loadImages(commonArtists, list1, list2) {
    const bannerArtist = commonArtists.length > 0 ? commonArtists[0].name : list1[0].name;

    const bannerUrl = await buscarImagemSpotify(bannerArtist, "artist");
    if (bannerUrl) {
        globalTopCommonImage = bannerUrl;
        
        const bannerEl = document.getElementById("bannerBackground");
        bannerEl.style.backgroundImage = `url('${bannerUrl}')`;
        bannerEl.style.opacity = 1;
        
        updateImageInDom("img-cardShared-0", bannerUrl);
    }

    if (list1.length > 0) {
        const url1 = await buscarImagemSpotify(list1[0].name, "artist");
        if (url1) updateImageInDom("img-cardUser1-0", url1);
    }

    if (list2.length > 0) {
        const url2 = await buscarImagemSpotify(list2[0].name, "artist");
        if (url2) updateImageInDom("img-cardUser2-0", url2);
    }
}

function updateImageInDom(elementId, url) {
    const el = document.getElementById(elementId);
    if (el) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            el.innerHTML = "";
            el.appendChild(img);
        };
    }
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
        console.warn("Falha token Spotify", e);
    }
    return null;
}

async function buscarImagemSpotify(artist, type) {
    const token = await obterTokenSpotify();
    if (!token) return null;
    
    const q = encodeURIComponent(`artist:"${artist}"`);
    try {
        const url = `https://api.spotify.com/v1/search?q=${q}&type=artist&limit=1`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.artists?.items?.length > 0) {
            return data.artists.items[0].images[0]?.url;
        }
    } catch (e) {
        console.warn("Erro imagem Spotify", e);
    }
    return null;
}

/* =========================================
   UI EVENTS & GERAÇÃO DE RELATÓRIO
   ========================================= */

function setupUIEvents() {
    const formatModal = document.getElementById("formatPickerModal");
    const colorModal = document.getElementById("colorPickerModal");
    const genBtn = document.getElementById("btnGerarRelatorio");

    genBtn.addEventListener("click", () => formatModal.style.display = "flex");

    document.querySelectorAll(".close-button").forEach(btn => {
        btn.addEventListener("click", function() {
            const modalId = this.getAttribute("data-modal");
            document.getElementById(modalId).style.display = "none";
        });
    });

    document.querySelectorAll(".format-option").forEach(btn => {
        btn.onclick = (e) => {
            selectedFormat = e.currentTarget.getAttribute("data-format");
            formatModal.style.display = "none";
            colorModal.style.display = "flex";
        };
    });

    document.querySelectorAll(".color-option").forEach(btn => {
        btn.onclick = (e) => {
            if (isGenerating) return;
            selectedAccentColor = e.currentTarget.getAttribute("data-color");
            colorModal.style.display = "none";
            generateFinalImage();
        };
    });
    
    window.onclick = (e) => {
        if (e.target == formatModal) formatModal.style.display = "none";
        if (e.target == colorModal) colorModal.style.display = "none";
    }
}

async function generateFinalImage() {
    isGenerating = true;
    const btn = document.getElementById("btnGerarRelatorio");
    btn.innerHTML = `${iconLoading} Generating...`;
    btn.disabled = true;

    let targetId = selectedFormat === "story" ? "storyCard" : "squareCardV2";
    let targetEl = document.getElementById(targetId);
    let width = 1080;
    let height = selectedFormat === "story" ? 1920 : 1080;

    // --- LÓGICA DO CARD SQUARE ---
    if (selectedFormat === "square") {
        // Injeta o NOME REAL no título da coluna
        document.getElementById("sqColTitle1").textContent = globalDisplayName1;
        document.getElementById("sqColTitle2").textContent = globalDisplayName2;
    } else {
        // No Story volta ao padrão (caso o usuário tenha trocado e voltado)
        document.getElementById("storyColTitle1").textContent = "User 1"; // ou deixe como estava
        document.getElementById("storyColTitle2").textContent = "User 2";
    }

    try {
        applyDynamicColors(targetEl, selectedAccentColor, selectedFormat);
        await new Promise(r => setTimeout(r, 500));

        const canvas = await html2canvas(targetEl, {
            scale: 1, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#0f0f0f",
            width: width,
            height: height,
            logging: false
        });

        const link = document.createElement("a");
        link.download = `Match-${user1}-vs-${user2}-${selectedFormat}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        btn.innerHTML = `${iconCheck} Saved!`;
        btn.style.backgroundColor = "#28a745";

    } catch (err) {
        console.error(err);
        alert("Error generating image.");
        btn.innerHTML = "Error :(";
    } finally {
        setTimeout(() => {
            btn.innerHTML = `${iconDownload} Generate Report`;
            btn.disabled = false;
            btn.style.backgroundColor = "";
            isGenerating = false;
        }, 3000);
    }
}

function applyDynamicColors(card, color, format) {
    if (format === "story") {
        card.querySelectorAll(".story-rank, .stat-label").forEach(el => el.style.color = color);
        
        card.querySelectorAll(".story-column h3").forEach(el => el.style.borderLeftColor = color);
        card.querySelectorAll(".story-item.top-1, .story-stat").forEach(el => {
            el.style.borderColor = color;
            el.style.backgroundColor = color + "22"; 
        });

        const headerBg = card.querySelector(".story-header");
        if (globalTopCommonImage) {
            headerBg.style.background = `
                linear-gradient(to bottom, rgba(15,15,15,0.3) 0%, #0f0f0f 100%),
                radial-gradient(circle at top right, ${color}99, transparent 60%),
                url('${globalTopCommonImage}') no-repeat center center / cover
            `;
        } else {
            headerBg.style.background = `radial-gradient(circle at top right, ${color}66, #0f0f0f)`;
        }

    } else {
        card.querySelectorAll(".sq-v2-rank, .sq-v2-stat-label").forEach(el => el.style.color = color);
        
        card.querySelectorAll(".sq-v2-column h3").forEach(el => el.style.borderLeftColor = color);
        card.querySelectorAll(".sq-v2-list li.top-1, .sq-v2-stat, .sq-v2-avatar").forEach(el => {
            el.style.borderColor = color;
            if(!el.classList.contains('sq-v2-avatar')) el.style.backgroundColor = color + "22";
        });
        
        card.style.background = `radial-gradient(circle at top right, ${color}44, #0f0f0f 60%)`;
    }
}

document.addEventListener("DOMContentLoaded", init);