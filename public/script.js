const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let currentDramaInfo = null;

// --- ELEMENT SELECTOR ---
const player = document.getElementById('mainPlayer');
const playIcon = document.getElementById('playIcon');
const seekBar = document.getElementById('seekBar');
const volBar = document.getElementById('volBar');

// --- PLAYER LOGIC ---
if (player) {
    player.ontimeupdate = () => {
        const val = (player.currentTime / player.duration) * 100 || 0;
        if (seekBar) seekBar.value = val;
        document.getElementById('curTime').innerText = formatTime(player.currentTime);
        document.getElementById('durTime').innerText = formatTime(player.duration);
    };
    player.onended = () => playSibling(1); // Auto-next episode
}

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

// --- API HELPER ---
async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { return null; }
}

// --- NAVIGASI & RENDER ---
async function switchView(mode, el) {
    // Update UI Navigasi
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase tracking-widest">Sinkronisasi...</div>';

    if (mode === 'library') return loadLibrary();

    // Mapping tab ke endpoint API
    const path = (mode === 'home' || mode === 'hot') ? '/netshort/theaters' : '/netshort/foryou';
    const data = await apiGet(path);
    
    if (!data) {
        content.innerHTML = '<p class="text-center py-20 opacity-30 text-xs">Gagal memuat data.</p>';
        return;
    }
    renderContent(data, mode);
}

function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    let categories = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    let hasDisplayed = false;
    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isHot = name.includes("VIRAL") || name.includes("HOT") || name.includes("POPULAR") || name.includes("TRENDING");

        // Filter: Home (Non-Hot), Hot (Kategori Viral), ForYou (Semua)
        let shouldShow = (mode === 'foryou') ? true : (mode === 'hot' ? isHot : !isHot);

        if (shouldShow && cat.contentInfos?.length) {
            const section = document.createElement('section');
            section.className = "mb-8";
            section.innerHTML = `
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest">${cat.contentName}</h2>
                </div>
                <div class="grid grid-cols-3 gap-3"></div>
            `;
            cat.contentInfos.forEach(item => section.querySelector('.grid').appendChild(createDramaCard(item)));
            content.appendChild(section);
            hasDisplayed = true;
        }
    });

    // Fallback jika tab kosong
    if (!hasDisplayed && categories.length > 0) renderContent(categories, 'foryou');
}

// --- HELPER: CARD & AUTO-SYNC EPISODE ---
function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    // Deteksi Jumlah Episode
    const totalEp = item.totalEpisode || item.episodeNum || item.shortPlayEpisodeNum || "??";
    const badgeText = isHist ? `EP ${item.lastEp}` : `${totalEp} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden glass mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=Poster'">
            <div class="ep-badge absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badgeText}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 uppercase leading-tight tracking-tighter">${title}</h3>
    `;

    // AUTO-SYNC: Jika masih ?? EP, ambil data asli dari API Detail
    if (!isHist && (totalEp === "??" || totalEp === 0)) {
        fetchTotalEpisode(id, div.querySelector('.ep-badge'));
    }

    return div;
}

async function fetchTotalEpisode(id, element) {
    try {
        const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
        if (res && res.totalEpisode) element.innerText = `${res.totalEpisode} EP`;
    } catch (e) {}
}

// --- MODAL PLAYER & SINKRONISASI DATA ---
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Sinkronisasi deskripsi...";
    
    // Ambil Data Detail Lengkap
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    const intro = res?.shotIntroduce || "Deskripsi tidak tersedia.";
    const total = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];

    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;

    currentDramaInfo = { id, title, total, cover, intro };
    setupBookmarkUI(currentDramaInfo);

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left glass p-4 rounded-xl flex justify-between items-center text-xs transition-all";
        btn.onclick = () => playEpisode(i, currentDramaInfo);
        btn.innerHTML = `<span class="font-bold">EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    if (epData.length > 0) {
        const idx = (startEp <= epData.length) ? startEp - 1 : 0;
        playEpisode(idx, currentDramaInfo);
    }
}

function playEpisode(index, dramaData) {
    if (!epData[index]) return;
    currentEpIndex = index;
    player.src = epData[index].playVoucher || epData[index].videoUrl;
    player.play();

    // Tanda Episode Aktif
    document.querySelectorAll('[id^="ep-btn-"]').forEach(b => b.classList.remove('ep-active'));
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.add('ep-active');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Update Riwayat (History Maks 6)
    const histItem = { ...dramaData, lastEp: index + 1, time: Date.now() };
    history = [histItem, ...history.filter(h => h.id !== dramaData.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

// --- BOOKMARK & LIBRARY ---
function setupBookmarkUI(dramaData) {
    const container = document.getElementById('modalAction');
    const isBookmarked = bookmarks.find(b => b.id === dramaData.id);
    container.innerHTML = `
        <button onclick="toggleBookmark(${JSON.stringify(dramaData).replace(/"/g, '&quot;')})" 
            class="w-10 h-10 glass rounded-full flex items-center justify-center transition-transform active:scale-125">
            <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark ${isBookmarked ? 'text-red-500' : 'text-white'}"></i>
        </button>
    `;
}

window.toggleBookmark = (data) => {
    const exists = bookmarks.find(b => b.id === data.id);
    if (exists) bookmarks = bookmarks.filter(b => b.id !== data.id);
    else bookmarks.unshift(data);
    localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
    setupBookmarkUI(data);
};

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-12 pb-20">
            <section>
                <h2 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Terakhir Ditonton</h2>
                <div id="histGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
            <section>
                <h2 class="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Koleksi Bookmark</h2>
                <div id="bookGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
        </div>
    `;
    const hG = document.getElementById('histGrid'), bG = document.getElementById('bookGrid');
    if (history.length) history.forEach(h => hG.appendChild(createDramaCard(h, true)));
    else hG.innerHTML = '<p class="text-[10px] text-gray-700 italic py-4">Kosong.</p>';
    if (bookmarks.length) bookmarks.forEach(b => bG.appendChild(createDramaCard(b)));
    else bG.innerHTML = '<p class="text-[10px] text-gray-700 italic py-4">Kosong.</p>';
}

// --- SEARCH & CONTROLS ---
async function performSearch(q) {
    if (!q) return;
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center text-red-600 font-bold text-xs uppercase tracking-widest">Mencari...</div>';
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(q)}`);
    const items = data?.searchCodeSearchResult || [];
    content.innerHTML = `<h2 class="text-[10px] font-black text-gray-500 mb-6 uppercase tracking-widest">Hasil Cari: ${q}</h2><div id="searchGrid" class="grid grid-cols-3 gap-3 pb-20"></div>`;
    const grid = document.getElementById('searchGrid');
    if (items.length) items.forEach(i => grid.appendChild(createDramaCard(i)));
    else content.innerHTML = '<p class="text-xs text-center opacity-30 py-10">Tidak ditemukan.</p>';
}

function togglePlay() {
    if (player.paused) { player.play(); playIcon.className = "fa-solid fa-pause ml-0"; }
    else { player.pause(); playIcon.className = "fa-solid fa-play ml-1"; }
}

function playSibling(dir) {
    const n = currentEpIndex + dir;
    if (n >= 0 && n < epData.length) playEpisode(n, currentDramaInfo);
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    player.pause();
    document.body.style.overflow = "auto";
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    // Default View
    switchView('home', document.querySelector('.nav-item'));
});

