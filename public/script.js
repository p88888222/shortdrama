const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let currentDramaInfo = null;

const player = document.getElementById('mainPlayer'), playIcon = document.getElementById('playIcon');
const seekBar = document.getElementById('seekBar'), volBar = document.getElementById('volBar');

// --- LOGIKA PLAYER ---
if (player) {
    player.ontimeupdate = () => {
        seekBar.value = (player.currentTime / player.duration) * 100 || 0;
        document.getElementById('curTime').innerText = formatTime(player.currentTime);
        document.getElementById('durTime').innerText = formatTime(player.duration);
    };
    player.onended = () => playSibling(1);
}
seekBar.oninput = () => player.currentTime = (seekBar.value / 100) * player.duration;
volBar.oninput = () => player.volume = volBar.value;

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

/**
 * 1. NAVIGASI UTAMA
 */
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs">SINKRONISASI DATA...</div>';

    if (mode === 'library') return loadLibrary();
    
    const path = (mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderContent(data, mode);
}

/**
 * 2. RENDER KONTEN (FOR YOU, HOME, HOT)
 */
function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    
    // For You kadang mengirim data kategori tunggal, bungkus jadi array jika perlu
    let categories = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    let hasDisplayed = false;
    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isViral = name.includes("VIRAL") || name.includes("TRENDING") || name.includes("HOT");
        
        let shouldShow = (mode === 'foryou') ? true : (mode === 'hot' ? isViral : !isViral);
        
        if (shouldShow && cat.contentInfos && cat.contentInfos.length > 0) {
            const section = document.createElement('section');
            section.className = "mb-8";
            section.innerHTML = `
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${cat.contentName}</h2>
                </div>
                <div class="grid grid-cols-3 gap-3"></div>
            `;
            const grid = section.querySelector('.grid');
            cat.contentInfos.forEach(item => grid.appendChild(createDramaCard(item)));
            content.appendChild(section);
            hasDisplayed = true;
        }
    });

    if (!hasDisplayed) content.innerHTML = '<p class="py-20 text-center text-xs opacity-30 italic">Konten kosong.</p>';
}

/**
 * 3. HELPER: DRAMA CARD
 */
function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    // Gunakan totalEpisode dari data awal jika ada, jika tidak pakai ??
    const totalEp = item.totalEpisode || item.episodeNum || "??";
    const badge = isHist ? `EP ${item.lastEp}` : `${totalEp} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    // Fungsi openDetail sekarang akan melakukan fetch data detail lagi berdasarkan ID
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badge}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 uppercase leading-tight tracking-tighter">${title}</h3>`;
    return div;
}

/**
 * 4. MODAL PLAYER & SINKRONISASI DETAIL
 * Mengambil shotIntroduce dan totalEpisode dari endpoint allepisode
 */
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    
    // Tampilkan judul sementara selagi loading detail
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Memuat deskripsi...";
    document.getElementById('modalTotalEp').innerText = "Memuat total episode...";

    // AMBIL DATA DARI ENDPOINT: /allepisode?shortPlayId=...
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    // SINKRONISASI DATA BERDASARKAN HASIL API
    const shotIntroduce = res?.shotIntroduce || "Deskripsi tidak tersedia.";
    const totalEpisode = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];

    // Tampilkan ke UI
    document.getElementById('modalDesc').innerText = shotIntroduce;
    document.getElementById('modalTotalEp').innerText = `${totalEpisode} TOTAL EPISODE`;
    
    currentDramaInfo = { id, title, total: totalEpisode, cover, intro: shotIntroduce }; 
    setupBookmark(id, currentDramaInfo);

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "ep-btn-item w-full text-left bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs border border-white/5 mb-1 transition-all";
        btn.onclick = () => playEpisode(i);
        btn.innerHTML = `<span class="ep-label">EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    const idxToPlay = (startEp > 0 && startEp <= epData.length) ? startEp - 1 : 0;
    if (epData.length > 0) playEpisode(idxToPlay);
}

function playEpisode(index) {
    if (!epData[index]) return;
    currentEpIndex = index;
    const ep = epData[index];

    player.src = ep.playVoucher || ep.videoUrl;
    player.play();
    if (playIcon) playIcon.className = "fa-solid fa-pause ml-0";

    // Highlight Active Episode
    document.querySelectorAll('.ep-btn-item').forEach(b => {
        b.classList.remove('ep-active');
        b.querySelector('.ep-label').classList.remove('text-red-500', 'font-bold');
    });
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.add('ep-active');
        activeBtn.querySelector('.ep-label').classList.add('text-red-500', 'font-bold');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Save History (Maksimal 6)
    const item = { ...currentDramaInfo, lastEp: index + 1, time: Date.now() };
    history = [item, ...history.filter(h => h.id !== item.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-10">
            <section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Terakhir Ditonton</h2><div id="hGrid" class="grid grid-cols-3 gap-3"></div></section>
            <section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Koleksi Bookmark</h2><div id="bGrid" class="grid grid-cols-3 gap-3"></div></section>
        </div>`;
    history.forEach(item => document.getElementById('hGrid').appendChild(createDramaCard(item, true)));
    bookmarks.forEach(item => document.getElementById('bGrid').appendChild(createDramaCard(item)));
}

// Global API Helper
async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); 
        return j.data || j;
    } catch (e) { return null; }
}

// Fungsi Player Dasar
function togglePlay() {
    if (player.paused) { player.play(); playIcon.className = "fa-solid fa-pause ml-0"; }
    else { player.pause(); playIcon.className = "fa-solid fa-play ml-1"; }
}
function playSibling(dir) {
    const n = currentEpIndex + dir;
    if (n >= 0 && n < epData.length) playEpisode(n);
}
function toggleFullscreen() {
    if (player.requestFullscreen) player.requestFullscreen();
    else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
}
function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    player.pause(); document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => {
    switchView('home', document.querySelector('.nav-item'));
});

