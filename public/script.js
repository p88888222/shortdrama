const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let currentDramaInfo = null;

const player = document.getElementById('mainPlayer'), playIcon = document.getElementById('playIcon');
const seekBar = document.getElementById('seekBar'), volBar = document.getElementById('volBar');

// 1. PLAYER LOGIC & SEARCH INITIALIZATION
if (player) {
    player.ontimeupdate = () => {
        seekBar.value = (player.currentTime / player.duration) * 100 || 0;
        document.getElementById('curTime').innerText = formatTime(player.currentTime);
        document.getElementById('durTime').innerText = formatTime(player.duration);
    };
    player.onended = () => playSibling(1);
}

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

async function performSearch(query) {
    if (!query) return;
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs">MENCARI...</div>';
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    const items = data?.searchCodeSearchResult || (Array.isArray(data) ? data : []);
    content.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">HASIL CARI: ${query.toUpperCase()}</h2></div><div id="searchGrid" class="grid grid-cols-3 gap-3"></div>`;
    if (items.length) items.forEach(item => document.getElementById('searchGrid').appendChild(createDramaCard(item)));
    else content.innerHTML = '<p class="py-20 text-center text-xs opacity-30 italic">Tidak ditemukan.</p>';
}

// 2. NAVIGASI & CONTENT RENDER
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs">MEMUAT...</div>';

    if (mode === 'library') return loadLibrary();
    const path = (mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderContent(data, mode);
}

function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    let categories = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isViral = name.includes("VIRAL") || name.includes("TRENDING") || name.includes("HOT");
        let show = (mode === 'foryou') ? true : (mode === 'hot' ? isViral : !isViral);

        if (show && cat.contentInfos?.length) {
            const section = document.createElement('section');
            section.className = "mb-8";
            section.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${cat.contentName}</h2></div><div class="grid grid-cols-3 gap-3"></div>`;
            cat.contentInfos.forEach(item => section.querySelector('.grid').appendChild(createDramaCard(item)));
            content.appendChild(section);
        }
    });
}

// 3. DETAIL MODAL & SINKRONISASI DATA (SHOTINTRODUCE & TOTALEPISODE)
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = title;

    // Ambil data detail lengkap
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    // Sinkronisasi shotIntroduce & totalEpisode
    const intro = res?.shotIntroduce || "Deskripsi tidak tersedia.";
    const total = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];

    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;
    
    currentDramaInfo = { id, title, total, cover, intro };
    setupBookmark(id, currentDramaInfo);

    // Render List Episode yang sempat hilang
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

    if (epData.length > 0) playEpisode((startEp <= epData.length ? startEp - 1 : 0));
}

function playEpisode(index) {
    if (!epData[index]) return;
    currentEpIndex = index;
    player.src = epData[index].playVoucher || epData[index].videoUrl;
    player.play();
    playIcon.className = "fa-solid fa-pause ml-0";

    // Highlight Tanda Episode
    document.querySelectorAll('.ep-btn-item').forEach(b => b.classList.remove('ep-active'));
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.add('ep-active');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Save History (Maks 6)
    const item = { ...currentDramaInfo, lastEp: index + 1, time: Date.now() };
    history = [item, ...history.filter(h => h.id !== id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

// 4. PLAYER CONTROLS & UTILS
function togglePlay() {
    if (player.paused) { player.play(); playIcon.className = "fa-solid fa-pause ml-0"; }
    else { player.pause(); playIcon.className = "fa-solid fa-play ml-1"; }
}

function playSibling(dir) {
    const n = currentEpIndex + dir;
    if (n >= 0 && n < epData.length) playEpisode(n);
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id, title = item.shortPlayName || item.title;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `<div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg"><img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'"><div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">${isHist ? 'EP '+item.lastEp : (item.totalEpisode || '??') + ' EP'}</div></div><h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 uppercase leading-tight tracking-tighter">${title}</h3>`;
    return div;
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `<div class="space-y-10"><section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Terakhir Ditonton</h2><div id="hGrid" class="grid grid-cols-3 gap-3"></div></section><section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Koleksi Bookmark</h2><div id="bGrid" class="grid grid-cols-3 gap-3"></div></section></div>`;
    history.forEach(item => document.getElementById('hGrid').appendChild(createDramaCard(item, true)));
    bookmarks.forEach(item => document.getElementById('bGrid').appendChild(createDramaCard(item)));
}

function setupBookmark(id, data) {
    let btn = document.getElementById('btnBookmark');
    if (!btn) {
        btn = document.createElement('button'); btn.id = "btnBookmark";
        btn.className = "w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white";
        document.getElementById('playerHeaderRight').prepend(btn);
    }
    const isBookmarked = bookmarks.find(b => b.id === id);
    btn.innerHTML = isBookmarked ? '<i class="fa-solid fa-bookmark text-red-500"></i>' : '<i class="fa-regular fa-bookmark"></i>';
    btn.onclick = () => {
        bookmarks = isBookmarked ? bookmarks.filter(b => b.id !== id) : [data, ...bookmarks];
        localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
        setupBookmark(id, data);
    };
}

async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { return null; }
}

function closeModal() { document.getElementById('detailModal').classList.add('hidden'); player.pause(); document.body.style.overflow = "auto"; }

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(e.target.value); });
    switchView('home', document.querySelector('.nav-item'));
});

