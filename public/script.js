const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1, controlTimeout;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let activeDrama = null;

const player = document.getElementById('mainPlayer');
const playIcon = document.getElementById('playIcon');
const videoControls = document.getElementById('videoControls');
const seekBar = document.getElementById('seekBar');

async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { return null; }
}

// --- PLAYER CONTROLS & AUTO-HIDE ---
function showControls() {
    videoControls.classList.remove('opacity-0', 'pointer-events-none');
    videoControls.classList.add('opacity-100', 'pointer-events-auto');
    clearTimeout(controlTimeout);
    controlTimeout = setTimeout(() => {
        if (!player.paused) {
            videoControls.classList.remove('opacity-100', 'pointer-events-auto');
            videoControls.classList.add('opacity-0', 'pointer-events-none');
        }
    }, 3000);
}

document.getElementById('videoContainer').addEventListener('click', showControls);

function togglePlay() {
    if (player.paused) {
        player.play();
        playIcon.className = "fa-solid fa-pause";
        showControls();
    } else {
        player.pause();
        playIcon.className = "fa-solid fa-play ml-1";
        showControls();
    }
}

function toggleFullscreen() {
    const container = document.getElementById('videoContainer');
    if (!document.fullscreenElement) {
        container.requestFullscreen?.() || container.webkitRequestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

player.ontimeupdate = () => {
    if (!player.duration) return;
    seekBar.value = (player.currentTime / player.duration) * 100;
    document.getElementById('curTime').innerText = formatTime(player.currentTime);
    document.getElementById('durTime').innerText = formatTime(player.duration);
};

seekBar.oninput = () => {
    player.currentTime = (seekBar.value / 100) * player.duration;
};

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

function changeQuality() {
    const t = player.currentTime;
    player.load();
    player.currentTime = t;
    player.play();
}

function playSibling(dir) {
    const n = currentEpIndex + dir;
    if (n >= 0 && n < epData.length) playEp(n);
}

// --- NAVIGASI & RENDER ---
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase">Loading...</div>';

    if (mode === 'library') return loadLibrary();

    const path = (mode === 'home' || mode === 'hot') ? '/netshort/theaters' : '/netshort/foryou';
    const data = await apiGet(path);
    renderContent(data, mode);
}

function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    let cats = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    let displayed = false;
    cats.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isHot = name.includes("VIRAL") || name.includes("HOT") || name.includes("POPULAR") || name.includes("TRENDING");
        let show = (mode === 'foryou') ? true : (mode === 'hot' ? isHot : !isHot);

        if (show && cat.contentInfos?.length) {
            const sec = document.createElement('section');
            sec.className = "mb-8";
            sec.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${cat.contentName}</h2></div><div class="grid grid-cols-3 gap-3"></div>`;
            cat.contentInfos.forEach(item => sec.querySelector('.grid').appendChild(createDramaCard(item)));
            content.appendChild(sec);
            displayed = true;
        }
    });
    if (!displayed && cats.length > 0) renderContent(cats, 'foryou');
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    const div = document.createElement('div');
    div.className = "drama-card animate-fade-in";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="card-img-container aspect-[3/4.2]">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy">
            <div class="card-badge glass-dark">
                ${isHist ? 'EP '+item.lastEp : (item.totalEpisode || item.episodeNum || '??') + ' EP'}
            </div>
        </div>
        <h3 class="mt-3 text-[10px] font-bold text-gray-400 line-clamp-2 leading-snug">${title}</h3>`;
    return div;
}

// --- MODAL & DATA DETAIL ---
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    showControls();

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Memuat...";

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    const intro = res?.shotIntroduce || "Deskripsi tidak tersedia.";
    const total = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];
    activeDrama = { id, title, cover, intro, total };

    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;
    updateBookmarkUI();

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left glass p-4 rounded-xl flex justify-between items-center text-xs";
        btn.onclick = () => playEp(i);
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    if (epData.length > 0) playEp(startEp - 1);
}

function playEp(idx) {
    if (!epData[idx]) return;
    currentEpIndex = idx;
    player.src = epData[idx].playVoucher || epData[idx].videoUrl;
    player.play();
    playIcon.className = "fa-solid fa-pause";

    document.querySelectorAll('[id^="ep-btn-"]').forEach(b => b.classList.remove('ep-active'));
    const active = document.getElementById(`ep-btn-${idx}`);
    if (active) {
        active.classList.add('ep-active');
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const histItem = { ...activeDrama, lastEp: idx + 1 };
    history = [histItem, ...history.filter(h => h.id !== activeDrama.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

function updateBookmarkUI() {
    const isBook = bookmarks.find(b => b.id === activeDrama.id);
    document.getElementById('modalAction').innerHTML = `
        <button onclick="toggleBook()" class="w-10 h-10 glass rounded-full flex items-center justify-center text-white">
            <i class="fa-${isBook ? 'solid' : 'regular'} fa-bookmark ${isBook ? 'text-red-500' : ''}"></i>
        </button>
    `;
}

function toggleBook() {
    const idx = bookmarks.findIndex(b => b.id === activeDrama.id);
    if (idx > -1) bookmarks.splice(idx, 1);
    else bookmarks.unshift(activeDrama);
    localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
    updateBookmarkUI();
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-12 pb-20">
            <section><h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">History</h2><div id="hG" class="grid grid-cols-3 gap-3"></div></section>
            <section><h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Bookmark</h2><div id="bG" class="grid grid-cols-3 gap-3"></div></section>
        </div>
    `;
    const hG = document.getElementById('hG'), bG = document.getElementById('bG');
    if (history.length) history.forEach(h => hG.appendChild(createDramaCard(h, true)));
    if (bookmarks.length) bookmarks.forEach(b => bG.appendChild(createDramaCard(b)));
}

async function performSearch(q) {
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center text-red-600 font-bold text-xs">MENCARI...</div>';
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(q)}`);
    const items = data?.searchCodeSearchResult || [];
    content.innerHTML = `<h2 class="text-[10px] font-black text-gray-500 mb-6 uppercase tracking-widest">Hasil: ${q}</h2><div id="sG" class="grid grid-cols-3 gap-3 pb-24"></div>`;
    if (items.length) items.forEach(i => document.getElementById('sG').appendChild(createDramaCard(i)));
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    player.pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    switchView('home', document.querySelector('.nav-item'));
});

