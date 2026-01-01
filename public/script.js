const API_BASE = "/api-proxy";
let epData = [];
let currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

// Inisialisasi Player & Kontrol
const player = document.getElementById('mainPlayer');
const seekBar = document.getElementById('seekBar');
const volBar = document.getElementById('volBar');
const playIcon = document.getElementById('playIcon');

if (player) {
    player.ontimeupdate = () => {
        const val = (player.currentTime / player.duration) * 100;
        if (seekBar) seekBar.value = val || 0;
        document.getElementById('curTime').innerText = formatTime(player.currentTime);
        document.getElementById('durTime').innerText = formatTime(player.duration);
    };
}

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

/**
 * 1. NAVIGASI UTAMA
 */
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-[10px] uppercase tracking-widest">Sinkronisasi Data...</div>';

    if (mode === 'library') {
        loadLibrary();
    } else {
        // Mengambil data dari endpoint sesuai mode
        const path = (mode === 'home') ? '/netshort/theaters' : '/netshort/foryou';
        const data = await apiGet(path);
        renderContent(data, mode);
    }
}

/**
 * 2. RENDER KONTEN (HOME & HOT)
 */
function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    if (!data || !Array.isArray(data)) {
        content.innerHTML = '<div class="py-20 text-center text-[10px] opacity-30">Gagal memuat drama.</div>';
        return;
    }

    let hasContent = false;
    data.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        // Filter Kata Kunci Viral/Trending untuk tab HOT
        const isViral = name.includes("HOT") || name.includes("VIRAL") || name.includes("TRENDING") || name.includes("POPULAR");
        
        if ((mode === 'hot' && isViral) || (mode === 'home' && !isViral)) {
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
            hasContent = true;
        }
    });

    // Fallback jika tab Hot kosong berdasarkan filter
    if (!hasContent && mode === 'hot') {
        renderFallback(data, "TRENDING SEKARANG");
    }
}

/**
 * 3. LIBRARY (HISTORY & BOOKMARK)
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

    const histGrid = document.getElementById('histGrid');
    if (history.length) {
        history.forEach(item => histGrid.appendChild(createDramaCard(item, true)));
    } else {
        histGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-20 italic py-4 text-center">Tidak ada riwayat.</p>';
    }

    const bookGrid = document.getElementById('bookGrid');
    if (bookmarks.length) {
        bookmarks.forEach(item => bookGrid.appendChild(createDramaCard(item)));
    } else {
        bookGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-20 italic py-4 text-center">Belum ada bookmark.</p>';
    }
}

/**
 * 4. HELPER: DRAMA CARD
 */
function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title;
    // Sinkronisasi data cover
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    // Tampilkan nomor episode terakhir jika dari Library History
    const badge = isHist ? `EP ${item.lastEp}` : `${item.totalEpisode || '??'} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, item.shotIntroduce || item.intro || "", item.totalEpisode || "", finalCover, isHist ? item.lastEp : 1);
    
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badge}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 px-1 uppercase leading-tight">${title}</h3>`;
    return div;
}

/**
 * 5. MODAL PLAYER & LOGIKA EPISODE
 */
async function openDetail(id, title, intro, total, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = intro; // Tampilkan shotIntroduce
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;

    // Ambil daftar episode dari API
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || [];
    
    // Handle Tombol Bookmark
    setupBookmark(id, {id, title, intro, total, cover});

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs border border-white/5 mb-1 active:bg-red-600/20";
        btn.onclick = () => playEpisode(i, id, title, total, cover);
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    // Otomatis mainkan episode terakhir ditonton
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

    // Simpan ke Riwayat (History)
    const histItem = { id, title, totalEpisode: total, lastEp: index + 1, cover, time: Date.now() };
    history = history.filter(h => h.id !== id);
    history.unshift(histItem);
    localStorage.setItem('dramaxin_history', JSON.stringify(history.slice(0, 15)));
}

function setupBookmark(id, data) {
    const btn = document.getElementById('btnBookmark') || createBookmarkBtn();
    const isBookmarked = bookmarks.find(b => b.id === id);
    btn.innerHTML = isBookmarked ? '<i class="fa-solid fa-bookmark text-red-500"></i>' : '<i class="fa-regular fa-bookmark"></i>';
    
    btn.onclick = () => {
        if (bookmarks.find(b => b.id === id)) {
            bookmarks = bookmarks.filter(b => b.id !== id);
        } else {
            bookmarks.unshift(data);
        }
        localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
        setupBookmark(id, data); // Refresh UI tombol
    };
}

function createBookmarkBtn() {
    const container = document.querySelector('#detailModal .flex.justify-between.items-start');
    const btn = document.createElement('button');
    btn.id = "btnBookmark";
    btn.className = "w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center ml-2 text-white";
    container.appendChild(btn);
    return btn;
}

// Global API Helper
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

