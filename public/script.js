const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1, controlTimeout, activeDrama = null;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

const player = document.getElementById('mainPlayer');
const playIcon = document.getElementById('playIcon');
const videoControls = document.getElementById('videoControls');
const seekBar = document.getElementById('seekBar');

// --- API HELPER ---
async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { return null; }
}

// --- PLAYER CONTROLS ---
function showControls() {
    videoControls.classList.remove('opacity-0', 'pointer-events-none');
    videoControls.classList.add('opacity-100', 'pointer-events-auto');
    clearTimeout(controlTimeout);
    controlTimeout = setTimeout(() => {
        if (player && !player.paused) {
            videoControls.classList.remove('opacity-100', 'pointer-events-auto');
            videoControls.classList.add('opacity-0', 'pointer-events-none');
        }
    }, 3000);
}

document.getElementById('videoContainer').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') showControls();
});

function togglePlay() {
    if (player.paused) { player.play(); playIcon.className = "fa-solid fa-pause"; showControls(); }
    else { player.pause(); playIcon.className = "fa-solid fa-play ml-1"; showControls(); }
}

function toggleFullscreen() {
    const container = document.getElementById('videoContainer');
    if (!document.fullscreenElement) container.requestFullscreen?.() || container.webkitRequestFullscreen?.();
    else document.exitFullscreen?.();
}

if (player) {
    player.ontimeupdate = () => {
        if (!player.duration) return;
        seekBar.value = (player.currentTime / player.duration) * 100;
        document.getElementById('curTime').innerText = formatTime(player.currentTime);
        document.getElementById('durTime').innerText = formatTime(player.duration);
    };
}

if (seekBar) seekBar.oninput = () => { player.currentTime = (seekBar.value / 100) * player.duration; };

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

function playSibling(dir) {
    const n = currentEpIndex + dir;
    if (n >= 0 && n < epData.length) playEp(n);
}

// --- RENDER & BACKGROUND SYNC ---
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase">Loading...</div>';
    if (mode === 'library') return loadLibrary();
    const data = await apiGet((mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters');
    renderContent(data, mode);
}

function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    let cats = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);
    cats.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isHot = name.includes("VIRAL") || name.includes("HOT") || name.includes("POPULAR");
        if (mode === 'foryou' || (mode === 'hot' ? isHot : !isHot)) {
            if (cat.contentInfos?.length) {
                const sec = document.createElement('section');
                sec.innerHTML = `<h2 class="text-sm font-black text-white uppercase tracking-tighter mb-5 pl-2 border-l-4 border-red-600">${cat.contentName}</h2><div class="grid grid-cols-3 gap-4"></div>`;
                cat.contentInfos.forEach(item => sec.querySelector('.grid').appendChild(createDramaCard(item)));
                content.appendChild(sec);
            }
        }
    });
    // Menjalankan Auto-Sync secara terpisah di latar belakang
    setTimeout(startBackgroundSync, 1000);
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    const totalEp = item.totalEpisode || item.episodeNum || 0;
    
    const div = document.createElement('div');
    div.className = "drama-card";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="card-img-container aspect-[3/4.2]">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy">
            <div class="card-badge glass-dark">
                <span class="sync-ep-text" data-id="${id}">${isHist ? 'EP '+item.lastEp : (totalEp > 0 ? totalEp+' EP' : '?? EP')}</span>
            </div>
        </div>
        <h3 class="mt-3 text-[10px] font-bold text-gray-400 line-clamp-2 leading-tight uppercase">${title}</h3>`;
    return div;
}

async function startBackgroundSync() {
    const elms = document.querySelectorAll('.sync-ep-text');
    for (let el of elms) {
        if (el.innerText.includes('??')) {
            await new Promise(r => setTimeout(r, 400)); // Jeda agar tidak membebani API
            const res = await apiGet(`/netshort/allepisode?shortPlayId=${el.dataset.id}`);
            if (res && res.totalEpisode) el.innerText = res.totalEpisode + " EP";
        }
    }
}

// --- DETAIL MODAL & PLAYER ---
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    if (player) { player.pause(); player.src = ""; }
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    showControls();
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Memuat deskripsi...";
    
    // Ambil data detail lengkap untuk modal
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || [];
    activeDrama = { 
        id, title, cover, 
        intro: res?.shotIntroduce || "Deskripsi tidak tersedia.", 
        total: res?.totalEpisode || epData.length || 0 
    };

    document.getElementById('modalDesc').innerText = activeDrama.intro;
    document.getElementById('modalTotalEp').innerText = `${activeDrama.total} EPISODES`;
    updateBookmarkUI();

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "ep-btn w-full text-left glass p-4 rounded-xl flex justify-between items-center text-xs";
        btn.onclick = () => playEp(i);
        btn.innerHTML = `<span class="font-bold">EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-500 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    if (epData.length > 0) playEp(startEp - 1);
}

function playEp(idx) {
    if (!epData || !epData[idx]) return;
    currentEpIndex = idx;
    const ep = epData[idx];

    // 1. Bersihkan track subtitle lama agar tidak menumpuk
    const oldTracks = player.querySelectorAll('track');
    oldTracks.forEach(t => t.remove());

    // 2. Set Sumber Video (Prioritas playVoucher)
    player.src = ep.playVoucher || ep.Url;

    // 3. LOGIKA SUBTITLE: Cek apakah ada file subtitle eksternal
    // Jika drama bukan 'Sulih Suara', biasanya teks ada di URL terpisah ini.
    const subUrl = ep.Url || ep.m3u8SubtitleUrl;
    
    if (subUrl) {
        const t = document.createElement('track');
        t.kind = "subtitles";
        t.label = "Indonesia";
        t.srclang = "id";
        t.src = subUrl;
        t.default = true; // Memaksa subtitle aktif secara otomatis
        player.appendChild(t);
        
        // Memastikan track aktif setelah dimuat
        t.addEventListener('load', () => {
            player.textTracks[0].mode = 'showing';
        });
    }

    // 4. Jalankan Player
    player.load();
    player.play().catch(e => console.warn("Autoplay ditunda"));
    
    if (playIcon) playIcon.className = "fa-solid fa-pause";

    // Update UI
    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('ep-active'));
    document.getElementById(`ep-btn-${idx}`)?.classList.add('ep-active');

    // Simpan History (Maksimal 6 drama terbaru)
    if (activeDrama) {
        const histItem = { ...activeDrama, lastEp: idx + 1 };
        history = [histItem, ...history.filter(h => h.id !== activeDrama.id)].slice(0, 6);
        localStorage.setItem('dramaxin_history', JSON.stringify(history));
    }
}


function updateBookmarkUI() {
    const isBook = bookmarks.find(b => b.id === activeDrama.id);
    document.getElementById('modalAction').innerHTML = `<button onclick="toggleBook()" class="w-11 h-11 glass rounded-full flex items-center justify-center text-white"><i class="fa-${isBook ? 'solid' : 'regular'} fa-heart ${isBook ? 'text-red-500' : ''}"></i></button>`;
}

function toggleBook() {
    const idx = bookmarks.findIndex(b => b.id === activeDrama.id);
    if (idx > -1) bookmarks.splice(idx, 1); else bookmarks.unshift(activeDrama);
    localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
    updateBookmarkUI();
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `<div class="space-y-10">
        <section><h2 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-5 pl-2 border-l-4 border-red-600">History (Maks 6)</h2><div id="hG" class="grid grid-cols-3 gap-4"></div></section>
        <section><h2 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-5 pl-2 border-l-4 border-red-600">Favorites</h2><div id="bG" class="grid grid-cols-3 gap-4"></div></section>
    </div>`;
    history.forEach(h => document.getElementById('hG').appendChild(createDramaCard(h, true)));
    bookmarks.forEach(b => document.getElementById('bG').appendChild(createDramaCard(b)));
}

async function performSearch(q) {
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center text-red-600 font-bold uppercase">Searching...</div>';
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(q)}`);
    const items = data?.searchCodeSearchResult || [];
    content.innerHTML = `<h2 class="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Results: ${q}</h2><div id="sG" class="grid grid-cols-3 gap-4"></div>`;
    items.forEach(i => document.getElementById('sG').appendChild(createDramaCard(i)));
}

function closeModal() { document.getElementById('detailModal').classList.add('hidden'); player.pause(); document.body.style.overflow = "auto"; }

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').onkeypress = (e) => { if(e.key === 'Enter') performSearch(e.target.value); };
    switchView('home', document.querySelector('.nav-item'));
});

