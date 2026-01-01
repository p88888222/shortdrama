const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1, currentDramaId = null;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

// --- UTILS ---
async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { console.error(e); return null; }
}

// --- CORE FUNCTIONS ---
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs">SINKRONISASI DATA...</div>';

    if (mode === 'library') return loadLibrary();

    const path = (mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    
    if (!data) {
        content.innerHTML = '<p class="text-center py-20 opacity-50 text-xs">Koneksi Error. Coba lagi.</p>';
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
        const isHot = name.includes("VIRAL") || name.includes("HOT") || name.includes("TRENDING") || name.includes("POPULAR");

        let shouldShow = (mode === 'foryou') ? true : (mode === 'hot' ? isHot : !isHot);

        if (shouldShow && cat.contentInfos?.length) {
            const section = document.createElement('section');
            section.innerHTML = `
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${cat.contentName}</h2>
                </div>
                <div class="grid grid-cols-3 gap-3"></div>
            `;
            cat.contentInfos.forEach(item => section.querySelector('.grid').appendChild(createDramaCard(item)));
            content.appendChild(section);
            hasDisplayed = true;
        }
    });

    // Fallback if empty
    if (!hasDisplayed && categories.length > 0) {
        renderContent(categories, 'foryou');
    }
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    const totalEp = item.totalEpisode || item.episodeNum || "??";
    const badge = isHist ? `EP ${item.lastEp}` : `${totalEp} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden glass mb-1 relative border border-white/5">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badge}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 uppercase leading-tight">${title}</h3>
    `;
    return div;
}

// --- PLAYER & DETAIL ---
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    const player = document.getElementById('mainPlayer');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";

    currentDramaId = id;
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Memuat deskripsi...";
    
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    const intro = res?.shotIntroduce || "Deskripsi tidak tersedia.";
    const total = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];

    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;

    // History & Bookmark data
    const dramaData = { id, title, cover, intro, total };
    setupBookmarkUI(dramaData);

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left glass p-4 rounded-xl flex justify-between items-center text-xs";
        btn.onclick = () => playEpisode(i, dramaData);
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    if (epData.length > 0) {
        const playIdx = (startEp <= epData.length) ? startEp - 1 : 0;
        playEpisode(playIdx, dramaData);
    }
}

function playEpisode(index, dramaData) {
    if (!epData[index]) return;
    currentEpIndex = index;
    const player = document.getElementById('mainPlayer');
    player.src = epData[index].playVoucher || epData[index].videoUrl;
    player.play();

    // Highlight active
    document.querySelectorAll('[id^="ep-btn-"]').forEach(b => b.classList.remove('ep-active'));
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.add('ep-active');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Save History (Maks 6)
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
            class="w-10 h-10 glass rounded-full flex items-center justify-center">
            <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark text-${isBookmarked ? 'red' : 'white'}-500"></i>
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
        <div class="space-y-10">
            <section><h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Terakhir Ditonton</h2><div id="histGrid" class="grid grid-cols-3 gap-3"></div></section>
            <section><h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Koleksi Bookmark</h2><div id="bookGrid" class="grid grid-cols-3 gap-3"></div></section>
        </div>
    `;
    const histGrid = document.getElementById('histGrid'), bookGrid = document.getElementById('bookGrid');
    if (history.length) history.forEach(h => histGrid.appendChild(createDramaCard(h, true)));
    else histGrid.innerHTML = '<p class="text-[10px] text-gray-600 italic py-4">Kosong.</p>';
    if (bookmarks.length) bookmarks.forEach(b => bookGrid.appendChild(createDramaCard(b)));
    else bookGrid.innerHTML = '<p class="text-[10px] text-gray-600 italic py-4">Kosong.</p>';
}

// --- SEARCH & INIT ---
async function performSearch(q) {
    if (!q) return;
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center text-red-600 font-bold text-xs uppercase">Mencari...</div>';
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(q)}`);
    const items = data?.searchCodeSearchResult || [];
    content.innerHTML = `<h2 class="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-widest">Hasil Cari: ${q}</h2><div id="searchGrid" class="grid grid-cols-3 gap-3"></div>`;
    const grid = document.getElementById('searchGrid');
    if (items.length) items.forEach(i => grid.appendChild(createDramaCard(i)));
    else content.innerHTML = '<p class="text-[10px] text-gray-600 italic py-4">Tidak ditemukan.</p>';
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    switchView('foryou', document.querySelector('.nav-item'));
});

