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
let globalTopCommonImage = ""; // URL da imagem para o banner e background dos cards
let selectedAccentColor = "#bb86fc";
let selectedFormat = "story"; // 'story' ou 'square'
let isGenerating = false;

/* =========================================
   INICIALIZAÇÃO (MAIN FLOW)
   ========================================= */
async function init() {
    console.log(`Starting Match: ${user1} vs ${user2}`);
    
    // Configura eventos de UI (Modais, Botões)
    setupUIEvents();

    try {
        // 1. Busca dados em paralelo (Perfil 1, Perfil 2, Top Artistas 1, Top Artistas 2)
        const [u1Profile, u2Profile, u1Artists, u2Artists] = await Promise.all([
            fetchLastFm("user.getinfo", user1),
            fetchLastFm("user.getinfo", user2),
            fetchLastFm("user.gettopartists", user1, "1month", 50), // Pegamos 50 para ter uma boa base de comparação
            fetchLastFm("user.gettopartists", user2, "1month", 50)
        ]);

        // 2. Processa Dados de Perfil
        renderProfiles(u1Profile, u2Profile);
        renderScrobbles(u1Profile, u2Profile);

        // 3. Lógica de Match (Algoritmo de Comparação)
        const matchResult = calculateCompatibility(u1Artists, u2Artists);

        // 4. Renderiza as Listas na Tela e nos Cards Ocultos
        renderLists(matchResult, u1Artists, u2Artists);

        // 5. Atualiza Score e Textos
        updateScoreUI(matchResult.score);

        // 6. Busca Imagens (Spotify) - Assíncrono para não travar a UI
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

// Wrapper para API do Last.fm
async function fetchLastFm(method, user, period = "", limit = "") {
    let url = `/api/?method=${method}&user=${user}`;
    if (period) url += `&period=${period}`;
    if (limit) url += `&limit=${limit}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) throw new Error(data.message);
    
    // Normaliza retorno para facilitar
    if (method === "user.gettopartists") {
        return data.topartists.artist || [];
    }
    return data; // Para user.getinfo
}

// Algoritmo de Compatibilidade
function calculateCompatibility(list1, list2) {
    // Normaliza para array (caso a API retorne objeto único)
    const arr1 = Array.isArray(list1) ? list1 : [list1];
    const arr2 = Array.isArray(list2) ? list2 : [list2];

    let commonArtists = [];
    let score = 0;

    // Mapa para busca rápida O(1)
    const map2 = new Map();
    arr2.forEach((artist, index) => map2.set(artist.name.toLowerCase(), index));

    arr1.forEach((artist, index1) => {
        const name = artist.name.toLowerCase();
        if (map2.has(name)) {
            const index2 = map2.get(name);
            
            // Peso baseado na posição (quanto mais alto no top, mais pontos)
            // Peso máximo = 50 (se ambos forem #1)
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

    // Ordena comuns por relevância
    commonArtists.sort((a, b) => b.quality - a.quality);

    // Cálculo do Score (0 a 100%)
    // Fórmula baseada na quantidade de comuns e suas posições
    // Se tiverem pelo menos 10 artistas em comum no top 50, já garante uma % alta
    const baseScore = (commonArtists.length / 50) * 100; // Quantidade
    const qualityScore = commonArtists.reduce((acc, curr) => acc + curr.quality, 0) / 10; // Qualidade
    
    let finalScore = Math.min(100, Math.round(baseScore * 0.4 + qualityScore * 0.6));
    
    // Boost se o top 1 for igual
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

    // Helper para imagem
    const getImg = (u) => (u.image.find(i => i.size === "extralarge") || u.image[0])["#text"] || "";

    // DOM Visível
    document.getElementById("userName1").textContent = u1.realname || u1.name;
    document.getElementById("userFoto1").src = getImg(u1);
    document.getElementById("userName2").textContent = u2.realname || u2.name;
    document.getElementById("userFoto2").src = getImg(u2);
    
    // Remove skeleton
    document.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));

    // DOM Cards Ocultos (Story & Square)
    const hiddenIds = ["story", "sq"];
    hiddenIds.forEach(prefix => {
        document.getElementById(`${prefix}UserName1`).textContent = u1.name;
        document.getElementById(`${prefix}UserImg1`).src = getImg(u1);
        document.getElementById(`${prefix}UserName2`).textContent = u2.name;
        document.getElementById(`${prefix}UserImg2`).src = getImg(u2);
        
        // Configura CORS para o html2canvas não quebrar
        document.getElementById(`${prefix}UserImg1`).crossOrigin = "anonymous";
        document.getElementById(`${prefix}UserImg2`).crossOrigin = "anonymous";
    });
}

function renderScrobbles(p1, p2) {
    // Apenas para mostrar no topo da página
    const s1 = parseInt(p1.user.playcount).toLocaleString("pt-BR");
    const s2 = parseInt(p2.user.playcount).toLocaleString("pt-BR");
    
    document.getElementById("userScrobbles1").textContent = s1;
    document.getElementById("userScrobbles2").textContent = s2;
}

function updateScoreUI(score) {
    // Score na tela
    const scoreEl = document.getElementById("compatibilityScore");
    let current = 0;
    const interval = setInterval(() => {
        current += 2;
        if (current >= score) {
            current = score;
            clearInterval(interval);
        }
        scoreEl.textContent = current;
    }, 20);

    // Texto descritivo
    let text = "Stranger Vibes";
    if (score > 30) text = "Musical Acquaintances";
    if (score > 50) text = "Vibe Buddies";
    if (score > 70) text = "Sonic Soulmates";
    if (score > 90) text = "A Perfect Match!";
    document.getElementById("commonContent").textContent = text;
    document.getElementById("storySharedText").textContent = text;

    // Score nos Cards
    document.getElementById("storyScoreValue").textContent = score + "%";
    document.getElementById("sqScoreValue").textContent = score + "%";
}

function renderLists(matchData, list1, list2) {
    // Top 5 User 1
    fillColumn("cardUser1", list1, false); // Tela
    fillHiddenColumn("storyList1", list1, "story"); // Card Story
    fillHiddenColumn("sqCol1List", list1, "square"); // Card Square

    // Top 5 User 2
    fillColumn("cardUser2", list2, false);
    fillHiddenColumn("storyList2", list2, "story");
    fillHiddenColumn("sqCol2List", list2, "square");

    // Top 5 Shared (Common)
    // Se não tiver comuns suficientes, completamos com vazio ou mensagem
    if (matchData.commonArtists.length === 0) {
        document.querySelector("#cardShared .lista-top").innerHTML = "<div style='padding:20px; text-align:center; color:#666;'>No common artists found in Top 50.</div>";
    } else {
        fillColumn("cardShared", matchData.commonArtists, true);
    }
}

// Preenche colunas visíveis (HTML da página)
function fillColumn(cardId, items, isShared) {
    const container = document.querySelector(`#${cardId} .lista-top`);
    if (!container) return;
    
    let html = "";
    // Mostramos Top 5 na tela
    const limit = 5;
    const data = items.slice(0, limit);

    data.forEach((item, i) => {
        const isTop1 = i === 0;
        const name = item.name;
        // Se for lista Shared, item tem rank1 e rank2, senão usa i+1
        const rankDisplay = isShared ? "" : `#${i + 1}`; 
        
        if (isTop1) {
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
            html += `<div class="chart-item">${rankDisplay} ${name}</div>`;
        }
    });

    container.innerHTML = html;
}

// Preenche colunas dos Cards Ocultos (HTML para imagem)
function fillHiddenColumn(elementId, items, format) {
    const container = document.getElementById(elementId);
    if (!container) return;

    let html = "";
    // Story: Top 5, Square: Top 5
    const limit = 5; 
    const data = items.slice(0, limit);

    data.forEach((item, i) => {
        const rank = i + 1;
        const name = item.name;

        if (format === "story") {
            // Estilo Story
            html += `
            <div class="story-item ${i === 0 ? 'top-1' : ''}">
                <span class="story-rank">#${rank}</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${name}</span>
            </div>`;
        } else {
            // Estilo Square (ul > li)
            html += `
            <li class="${i === 0 ? 'top-1' : ''}">
                <span class="sq-v2-rank">#${rank}</span>
                <span class="sq-v2-text">${name}</span>
            </li>`;
        }
    });

    container.innerHTML = html;
}

/* =========================================
   IMAGENS & SPOTIFY
   ========================================= */

async function loadImages(commonArtists, list1, list2) {
    // Prioridade para Banner: 1º Comum -> Se não, 1º do User 1
    const bannerArtist = commonArtists.length > 0 ? commonArtists[0].name : list1[0].name;

    // 1. Busca imagem do Banner (e salva globalmente)
    const bannerUrl = await buscarImagemSpotify(bannerArtist, "artist");
    if (bannerUrl) {
        globalTopCommonImage = bannerUrl;
        
        // Atualiza Banner da Página
        const bannerEl = document.getElementById("bannerBackground");
        bannerEl.style.backgroundImage = `url('${bannerUrl}')`;
        bannerEl.style.opacity = 1;
        
        // Atualiza Top 1 Shared na tela (se existir)
        updateImageInDom("img-cardShared-0", bannerUrl);
    }

    // 2. Busca Imagem Top 1 User 1
    if (list1.length > 0) {
        const url1 = await buscarImagemSpotify(list1[0].name, "artist");
        if (url1) updateImageInDom("img-cardUser1-0", url1);
    }

    // 3. Busca Imagem Top 1 User 2
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
    const confirmColorBtn = document.getElementById("confirmColumnsBtn"); // "Choose Color"

    // Abrir modal de formato
    genBtn.addEventListener("click", () => formatModal.style.display = "flex");

    // Fechar modais
    document.querySelectorAll(".close-button").forEach(btn => {
        btn.addEventListener("click", function() {
            const modalId = this.getAttribute("data-modal");
            document.getElementById(modalId).style.display = "none";
        });
    });

    // Seleção de Formato
    document.querySelectorAll(".format-option").forEach(btn => {
        btn.onclick = (e) => {
            selectedFormat = e.currentTarget.getAttribute("data-format");
            // Highlight visual
            document.querySelectorAll(".format-option").forEach(b => b.style.borderColor = "rgba(255,255,255,0.1)");
            e.currentTarget.style.borderColor = "#bb86fc";
        };
    });

    // Botão "Choose Color" (que na vdd vai para o color picker)
    confirmColorBtn.addEventListener("click", () => {
        formatModal.style.display = "none";
        colorModal.style.display = "flex";
    });

    // Seleção de Cor e Geração Final
    document.querySelectorAll(".color-option").forEach(btn => {
        btn.onclick = (e) => {
            if (isGenerating) return;
            selectedAccentColor = e.currentTarget.getAttribute("data-color");
            colorModal.style.display = "none";
            generateFinalImage();
        };
    });
    
    // Fechar ao clicar fora
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

    // Seleciona o card correto baseando no formato
    let targetId = selectedFormat === "story" ? "storyCard" : "squareCardV2";
    let targetEl = document.getElementById(targetId);
    let width = selectedFormat === "story" ? 1080 : 1080;
    let height = selectedFormat === "story" ? 1920 : 1080;

    try {
        // Aplica cores dinâmicas antes de tirar o print
        applyDynamicColors(targetEl, selectedAccentColor, selectedFormat);

        // Pequeno delay para renderizar CSS
        await new Promise(r => setTimeout(r, 500));

        const canvas = await html2canvas(targetEl, {
            scale: 1, // Já está em tamanho HD no CSS
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
        // Elementos Story
        card.querySelectorAll(".story-rank, .stat-label, .story-brand").forEach(el => el.style.color = color);
        card.querySelectorAll(".story-column h3").forEach(el => el.style.borderLeftColor = color);
        card.querySelectorAll(".story-item.top-1, .story-stat").forEach(el => {
            el.style.borderColor = color;
            el.style.backgroundColor = color + "22"; // 22 = baixa opacidade hex
        });

        // Background com Imagem do Artista em Comum
        const headerBg = card.querySelector(".story-header");
        if (globalTopCommonImage) {
            headerBg.style.background = `
                linear-gradient(to bottom, ${color}66 0%, transparent 40%),
                linear-gradient(to top, #0f0f0f 0%, rgba(15,15,15,0.6) 50%, transparent 100%),
                url('${globalTopCommonImage}') no-repeat center center / cover
            `;
        } else {
            headerBg.style.background = `radial-gradient(circle at top right, ${color}66, #0f0f0f)`;
        }

    } else {
        // Elementos Square
        card.querySelectorAll(".sq-v2-rank, .sq-v2-stat-label, .sq-v2-brand").forEach(el => el.style.color = color);
        card.querySelectorAll(".sq-v2-column h3").forEach(el => el.style.borderLeftColor = color);
        card.querySelectorAll(".sq-v2-list li.top-1, .sq-v2-stat, .sq-v2-avatar").forEach(el => {
            el.style.borderColor = color;
            if(!el.classList.contains('sq-v2-avatar')) el.style.backgroundColor = color + "22";
        });
        
        card.style.background = `radial-gradient(circle at top right, ${color}44, #0f0f0f 60%)`;
    }
}

// Start
document.addEventListener("DOMContentLoaded", init);