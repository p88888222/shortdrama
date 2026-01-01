const API_BASE = "/api-proxy";
let epData = [];
let currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');

// 1. Inisialisasi Player
const player = document.getElementById('mainPlayer');
const seekBar = document.getElementById('seekBar');
const volBar = document.getElementById('volBar');
const playIcon = document.getElementById('playIcon');

player.ontimeupdate = () => {
    const val = (player.currentTime / player.duration) * 100;
    seekBar.value = val || 0;
    document.getElementById('curTime').innerText = formatTime(player.currentTime);
    document.getElementById('durTime').innerText = formatTime(player.duration);
};

seekBar.oninput = () => { player.currentTime = (seekBar.value / 100) * player.duration; };
volBar.oninput = () => { player.volume = volBar.value; };

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60); let s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

function togglePlay() {
    if (player.paused) { player.play(); playIcon.className = "fa-solid fa-pause"; }
    else { player.pause(); playIcon.className = "fa-solid fa-play ml-1"; }
}

function toggleFullscreen() {
    if (player.requestFullscreen) player.requestFullscreen();
    else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
}

function changeQuality() {
    const time = player.currentTime;
    player.load(); player.currentTime = time; player.play();
}

// 2. Navigasi & Load Data
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs">MEMUAT...</div>';

    if (mode === 'library') loadLibrary();
    else {
        const path = mode === 'home' ? '/netshort/theaters' : '/netshort/foryou';
        const data = await apiGet(path);
        renderHome(data, mode);
    }
}

function renderHome(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    if (!Array.isArray(data)) return;

    data.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isHot = name.includes("HOT") || name.includes("VIRAL") || name.includes("TRENDING");
        
        if ((mode === 'hot' && isHot) || (mode === 'home' && !isHot)) {
            const section = document.createElement('section');
            section.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${cat.contentName}</h2></div><div class="grid grid-cols-3 gap-3"></div>`;
            const grid = section.querySelector('.grid');
            cat.contentInfos.forEach(item => grid.appendChild(createDramaCard(item)));
            content.appendChild(section);
        }
    });
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `<div><div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terakhir Ditonton</h2></div><div id="histGrid" class="grid grid-cols-3 gap-3"></div></div>`;
    const grid = document.getElementById('histGrid');
    if (history.length) history.forEach(item => grid.appendChild(createDramaCard(item, true)));
    else grid.innerHTML = '<p class="text-[10px] opacity-30 italic py-4">Belum ada riwayat.</p>';
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    const badge = isHist ? `EP ${item.lastEp}` : `${item.totalEpisode || '??'} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    // Jika dari riwayat, teruskan episode terakhir
    div.onclick = () => openDetail(id, title, item.shotIntroduce || "", item.totalEpisode || "", finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">${badge}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 px-1 uppercase leading-tight">${title}</h3>`;
    return div;
}

async function openDetail(id, title, intro, total, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || [];
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs border border-white/5 mb-1";
        btn.onclick = () => playEpisode(i, id, title, total, cover);
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    // Otomatis putar episode terakhir (startEp - 1 karena index mulai dari 0)
    if (epData.length > 0) {
        const indexToPlay = (startEp > 0 && startEp <= epData.length) ? startEp - 1 : 0;
        playEpisode(indexToPlay, id, title, total, cover);
    }
}

function playEpisode(index, id, title, total, cover) {
    currentEpIndex = index;
    const ep = epData[index];
    player.src = ep.playVoucher || ep.videoUrl;
    player.play();
    playIcon.className = "fa-solid fa-pause";
    
    // Highlight Button
    document.querySelectorAll('.ep-btn-active').forEach(b => b.classList.remove('ep-btn-active', 'bg-red-600/20'));
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if(activeBtn) activeBtn.classList.add('ep-btn-active', 'bg-red-600/20');

    // Save History
    const item = { id, title, totalEpisode: total, lastEp: index + 1, cover, time: Date.now() };
    history = history.filter(h => h.id !== id);
    history.unshift(item);
    localStorage.setItem('dramaxin_history', JSON.stringify(history.slice(0, 12)));
}

function playSibling(dir) {
    const next = currentEpIndex + dir;
    if (next >= 0 && next < epData.length) {
        const activeDrama = history[0]; // Ambil data drama yang sedang aktif
        playEpisode(next, activeDrama.id, activeDrama.title, activeDrama.totalEpisode, activeDrama.cover);
    }
}

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    player.pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => switchView('home', document.querySelector('.nav-item')));

