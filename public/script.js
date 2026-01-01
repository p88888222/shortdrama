const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let currentDramaInfo = null;

const player = document.getElementById('mainPlayer'), playIcon = document.getElementById('playIcon');
const seekBar = document.getElementById('seekBar'), volBar = document.getElementById('volBar');

/** * 1. VIDEO PLAYER LOGIC */
if (player) {
    player.ontimeupdate = () => {
        const val = (player.currentTime / player.duration) * 100 || 0;
        if (seekBar) seekBar.value = val;
        document.getElementById('curTime').innerText = formatTime(player.currentTime);
        document.getElementById('durTime').innerText = formatTime(player.duration);
    };
    player.onended = () => playSibling(1);
}
if (seekBar) seekBar.oninput = () => player.currentTime = (seekBar.value / 100) * player.duration;
if (volBar) volBar.oninput = () => player.volume = volBar.value;

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

/** * 2. NAVIGASI UTAMA */
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase tracking-widest">Sinkronisasi...</div>';

    if (mode === 'library') return loadLibrary();
    
    const path = (mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderContent(data, mode);
}

/** * 3. RENDER KONTEN (FIX TAB KOSONG) */
function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    
    let categories = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    // Filter Chip Otomatis berdasarkan kategori yang ada di API
    if (mode === 'home' && categories.length > 0) {
        const filterWrap = document.createElement('div');
        filterWrap.className = "flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar";
        
        const allTags = ["Semua", ...new Set(categories.map(c => c.contentName))];
        allTags.forEach(tag => {
            const chip = document.createElement('button');
            chip.className = "filter-chip px-4 py-1.5 glass-card rounded-full text-[10px] font-bold whitespace-nowrap text-gray-400";
            chip.innerText = tag;
            chip.onclick = () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('text-white', 'bg-red-600/20'));
                chip.classList.add('text-white', 'bg-red-600/20');
                filterByTag(tag);
            };
            filterWrap.appendChild(chip);
        });
        content.appendChild(filterWrap);
    }

    let hasDisplayed = false;
    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isHot = name.includes("VIRAL") || name.includes("TRENDING") || name.includes("HOT") || name.includes("POPULAR");
        
        let shouldShow = (mode === 'foryou') ? true : (mode === 'hot' ? isHot : !isHot);
        
        if (shouldShow && cat.contentInfos?.length) {
            const section = document.createElement('section');
            section.className = "mb-8 drama-section";
            section.dataset.tagName = cat.contentName;
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

    if (!hasDisplayed && categories.length > 0) {
        renderFallback(categories[0], mode === 'hot' ? "DRAMA TERPOPULER" : "REKOMENDASI");
    }
}

function filterByTag(tag) {
    document.querySelectorAll('.drama-section').forEach(sec => {
        sec.style.display = (tag === "Semua" || sec.dataset.tagName === tag) ? "block" : "none";
    });
}

function renderFallback(category, label) {
    const content = document.getElementById('appContent');
    const section = document.createElement('section');
    section.innerHTML = `
        <div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${label}</h2></div>
        <div class="grid grid-cols-3 gap-3"></div>
    `;
    (category.contentInfos || []).forEach(item => section.querySelector('.grid').appendChild(createDramaCard(item)));
    content.appendChild(section);
}

/** * 4. HELPER: CARD & EPISODE SYNC */
function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id, title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    const totalEp = item.totalEpisode || item.episodeNum || "??";
    const badgeText = isHist ? `EP ${item.lastEp}` : `${totalEp} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'">
            <div class="ep-badge absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badgeText}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 uppercase leading-tight tracking-tighter">${title}</h3>
    `;

    if (!isHist && (totalEp === "??" || totalEp === 0)) fetchTotalEpisode(id, div.querySelector('.ep-badge'));
    return div;
}

async function fetchTotalEpisode(id, element) {
    try {
        const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
        if (res && res.totalEpisode) element.innerText = `${res.totalEpisode} EP`;
    } catch (e) {}
}

/** * 5. MODAL PLAYER & SINKRONISASI DATA */
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = title;
    
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    const intro = res?.shotIntroduce || "Deskripsi tidak tersedia.";
    const total = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];

    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;
    
    currentDramaInfo = { id, title, total, cover, intro };
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

    if (epData.length > 0) playEpisode((startEp <= epData.length ? startEp - 1 : 0));
}

function playEpisode(index) {
    if (!epData[index]) return;
    currentEpIndex = index;
    player.src = epData[index].playVoucher || epData[index].videoUrl;
    player.play();
    if (playIcon) playIcon.className = "fa-solid fa-pause ml-0";

    document.querySelectorAll('.ep-btn-item').forEach(b => {
        b.classList.remove('ep-active');
        b.querySelector('.ep-label').style.color = "#94a3b8";
    });
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.add('ep-active');
        activeBtn.querySelector('.ep-label').style.color = "#ef4444";
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const item = { ...currentDramaInfo, lastEp: index + 1, time: Date.now() };
    history = [item, ...history.filter(h => h.id !== item.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

/** * 6. LIBRARY & UTILS */
function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `<div class="space-y-10"><section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Terakhir Ditonton (Maks 6)</h2><div id="hGrid" class="grid grid-cols-3 gap-3"></div></section><section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Bookmark</h2><div id="bGrid" class="grid grid-cols-3 gap-3"></div></section></div>`;
    history.forEach(item => document.getElementById('hGrid').appendChild(createDramaCard(item, true)));
    bookmarks.forEach(item => document.getElementById('bGrid').appendChild(createDramaCard(item)));
}

async function performSearch(query) {
    if (!query) return;
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase">Mencari...</div>';
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    const items = data?.searchCodeSearchResult || (Array.isArray(data) ? data : []);
    content.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">HASIL: ${query.toUpperCase()}</h2></div><div id="searchGrid" class="grid grid-cols-3 gap-3"></div>`;
    if (items.length) items.forEach(item => document.getElementById('searchGrid').appendChild(createDramaCard(item)));
    else content.innerHTML = '<p class="py-20 text-center text-xs opacity-30 italic">Tidak ditemukan.</p>';
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
function changeQuality() {
    const t = player.currentTime; player.load(); player.currentTime = t; player.play();
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    switchView('home', document.querySelector('.nav-item'));
});

