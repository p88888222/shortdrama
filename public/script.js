const API_BASE = "/api-proxy";
let epData = [];
let currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

const player = document.getElementById('mainPlayer');
const playIcon = document.getElementById('playIcon');

/**
 * 1. NAVIGASI UTAMA
 * Home mengambil dari /theaters, Hot mengambil dari /foryou
 */
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-[10px] uppercase tracking-widest">Sinkronisasi...</div>';

    if (mode === 'library') {
        loadLibrary();
    } else {
        const path = (mode === 'hot') ? '/netshort/foryou' : '/netshort/theaters';
        const data = await apiGet(path);
        renderContent(data, mode);
    }
}

/**
 * 2. RENDER KONTEN (HOME & HOT)
 * Tab HOT difilter khusus untuk contentName "Viral" atau "Trending"
 */
function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    
    if (!data || !Array.isArray(data)) {
        content.innerHTML = '<div class="py-20 text-center text-[10px] opacity-30">Konten tidak tersedia.</div>';
        return;
    }

    let hasDisplayed = false;

    data.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        // LOGIKA FILTER: HOT hanya untuk VIRAL/TRENDING, HOME untuk selain itu
        const isHotMatch = name.includes("VIRAL") || name.includes("TRENDING");
        
        if ((mode === 'hot' && isHotMatch) || (mode === 'home' && !isHotMatch)) {
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
            (cat.contentInfos || []).forEach(item => grid.appendChild(createDramaCard(item)));
            content.appendChild(section);
            hasDisplayed = true;
        }
    });

    // Fallback jika tidak ada kategori yang cocok dengan filter string
    if (!hasDisplayed && mode === 'hot' && data.length > 0) {
        renderFallback(data[0], "DRAMA VIRAL");
    }
}

function renderFallback(category, label) {
    const content = document.getElementById('appContent');
    const section = document.createElement('section');
    section.innerHTML = `
        <div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${label}</h2></div>
        <div class="grid grid-cols-3 gap-3"></div>
    `;
    const grid = section.querySelector('.grid');
    (category.contentInfos || []).forEach(item => grid.appendChild(createDramaCard(item)));
    content.appendChild(section);
}

/**
 * 3. LIBRARY (LIMIT HISTORY 6 DRAMA)
 */
function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-10">
            <section>
                <div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terakhir Ditonton</h2></div>
                <div id="histGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
            <section>
                <div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Koleksi Bookmark</h2></div>
                <div id="bookGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
        </div>`;

    // Hanya tampilkan 6 riwayat terakhir
    const histGrid = document.getElementById('histGrid');
    const recentHistory = history.slice(0, 6);
    if (recentHistory.length) {
        recentHistory.forEach(item => histGrid.appendChild(createDramaCard(item, true)));
    } else {
        histGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-20 italic py-4 text-center">Belum ada riwayat.</p>';
    }

    const bookGrid = document.getElementById('bookGrid');
    if (bookmarks.length) {
        bookmarks.forEach(item => bookGrid.appendChild(createDramaCard(item)));
    } else {
        bookGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-20 italic py-4 text-center">Belum ada bookmark.</p>';
    }
}

/**
 * 4. DRAMA CARD & PLAYER LOGIC
 */
function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    const badge = isHist ? `EP ${item.lastEp}` : `${item.totalEpisode || '??'} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, item.shotIntroduce || item.intro || "", item.totalEpisode || "", finalCover, isHist ? item.lastEp : 1);
    
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badge}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 uppercase leading-tight">${title}</h3>`;
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
    
    setupBookmark(id, {id, title, intro, total, cover});

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

    // Otomatis putar episode terakhir jika klik dari riwayat
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

    // Simpan ke Riwayat (Maksimal 6 drama di memori)
    const histItem = { id, title, totalEpisode: total, lastEp: index + 1, cover, time: Date.now() };
    history = history.filter(h => h.id !== id);
    history.unshift(histItem);
    
    if (history.length > 6) history.pop();
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

function setupBookmark(id, data) {
    let btn = document.getElementById('btnBookmark');
    if (!btn) {
        const container = document.querySelector('#detailModal .flex.justify-between.items-start');
        btn = document.createElement('button');
        btn.id = "btnBookmark";
        btn.className = "w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center ml-2 text-white";
        container.appendChild(btn);
    }
    
    const isBookmarked = bookmarks.find(b => b.id === id);
    btn.innerHTML = isBookmarked ? '<i class="fa-solid fa-bookmark text-red-500"></i>' : '<i class="fa-regular fa-bookmark"></i>';
    
    btn.onclick = () => {
        if (bookmarks.find(b => b.id === id)) {
            bookmarks = bookmarks.filter(b => b.id !== id);
        } else {
            bookmarks.unshift(data);
        }
        localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
        setupBookmark(id, data);
    };
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

