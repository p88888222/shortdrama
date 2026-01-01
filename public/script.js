const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

const player = document.getElementById('mainPlayer'), playIcon = document.getElementById('playIcon');
const seekBar = document.getElementById('seekBar'), volBar = document.getElementById('volBar');

player.ontimeupdate = () => {
    seekBar.value = (player.currentTime / player.duration) * 100 || 0;
    document.getElementById('curTime').innerText = formatTime(player.currentTime);
    document.getElementById('durTime').innerText = formatTime(player.duration);
};
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
    
    document.getElementById('appContent').innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs">SINKRONISASI DATA...</div>';

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
    
    // Perbaikan: Pastikan data diolah sebagai array meskipun struktur API berbeda
    let categories = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    let hasDisplayed = false;
    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isViral = name.includes("VIRAL") || name.includes("TRENDING");
        
        let shouldShow = false;
        if (mode === 'foryou') {
            shouldShow = true; // Tampilkan semua kategori di For You tanpa filter
        } else if (mode === 'hot') {
            shouldShow = isViral;
        } else if (mode === 'home') {
            shouldShow = !isViral;
        }
        
        if (shouldShow && cat.contentInfos && cat.contentInfos.length > 0) {
            const section = document.createElement('section');
            section.className = "mb-8";
            section.innerHTML = `
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${cat.contentName || 'REKOMENDASI'}</h2>
                </div>
                <div class="grid grid-cols-3 gap-3"></div>
            `;
            const grid = section.querySelector('.grid');
            cat.contentInfos.forEach(item => grid.appendChild(createDramaCard(item)));
            content.appendChild(section);
            hasDisplayed = true;
        }
    });

    if (!hasDisplayed) {
        content.innerHTML = '<p class="py-20 text-center text-xs opacity-30 italic">Konten sedang disiapkan...</p>';
    }
}

/**
 * 3. LIBRARY (HISTORY LIMIT 6 & BOOKMARK)
 */
function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `<div class="space-y-10"><section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4">Terakhir Ditonton</h2><div id="hGrid" class="grid grid-cols-3 gap-3"></div></section><section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4">Koleksi Bookmark</h2><div id="bGrid" class="grid grid-cols-3 gap-3"></div></section></div>`;
    const hGrid = document.getElementById('hGrid'), bGrid = document.getElementById('bGrid');
    
    history.slice(0, 6).forEach(item => hGrid.appendChild(createDramaCard(item, true)));
    bookmarks.forEach(item => bGrid.appendChild(createDramaCard(item)));
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id, title = item.shortPlayName || item.title;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    const badge = isHist ? `EP ${item.lastEp}` : `${item.totalEpisode || item.episodeNum || '??'} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, item.shotIntroduce || "", item.totalEpisode || "", finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `<div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg"><img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'"><div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badge}</div></div><h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 uppercase leading-tight tracking-tighter">${title}</h3>`;
    return div;
}

/**
 * 4. MODAL PLAYER & HIGHLIGHT EPISODE
 */
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
        // Class dasar untuk tombol episode
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs border border-white/5 mb-1 transition-all";
        btn.onclick = () => playEpisode(i, id, title, total, cover);
        btn.innerHTML = `<span class="ep-text">EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    // Otomatis mainkan episode (startEp - 1 karena index mulai dari 0)
    const idxToPlay = (startEp > 0 && startEp <= epData.length) ? startEp - 1 : 0;
    if (epData.length > 0) playEpisode(idxToPlay, id, title, total, cover);
}

function playEpisode(index, id, title, total, cover) {
    currentEpIndex = index;
    const ep = epData[index];
    if (!ep) return;

    player.src = ep.playVoucher || ep.videoUrl;
    player.play();
    if (playIcon) playIcon.className = "fa-solid fa-pause";

    // --- LOGIKA HIGHLIGHT (TANDA) EPISODE AKTIF ---
    document.querySelectorAll('.bg-red-600\\/20').forEach(b => {
        b.classList.remove('bg-red-600/20', 'border-red-600/50');
        b.querySelector('.ep-text').style.color = '#94a3b8'; // Kembali ke warna abu-abu
    });
    
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-red-600/20', 'border-red-600/50');
        activeBtn.querySelector('.ep-text').style.color = '#ef4444'; // Ubah teks jadi merah
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Simpan History & Batasi 6 drama
    const item = { id, title, totalEpisode: total, lastEp: index + 1, cover, time: Date.now() };
    history = [item, ...history.filter(h => h.id !== id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { return null; }
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    player.pause(); document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => switchView('home', document.querySelector('.nav-item')));

