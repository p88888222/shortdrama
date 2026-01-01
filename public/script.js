const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let currentDramaInfo = null;

// Element Selector
const player = document.getElementById('mainPlayer'), playIcon = document.getElementById('playIcon');
const seekBar = document.getElementById('seekBar'), volBar = document.getElementById('volBar');

/** * 1. LOGIKA VIDEO PLAYER 
 */
if (player) {
    player.ontimeupdate = () => {
        const val = (player.currentTime / player.duration) * 100 || 0;
        if (seekBar) seekBar.value = val;
        document.getElementById('curTime').innerText = formatTime(player.currentTime);
        document.getElementById('durTime').innerText = formatTime(player.duration);
    };
    player.onended = () => playSibling(1); // Auto-next saat episode selesai
}

if (seekBar) seekBar.oninput = () => player.currentTime = (seekBar.value / 100) * player.duration;
if (volBar) volBar.oninput = () => player.volume = volBar.value;

function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    let m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

/** * 2. NAVIGASI UTAMA 
 */
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase tracking-widest">Sinkronisasi...</div>';

    if (mode === 'library') return loadLibrary();
    
    // Tab For You pakai /foryou, sisanya pakai /theaters
    const path = (mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderContent(data, mode);
}

/** * 3. RENDER KONTEN & FILTER 
 */
function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    let categories = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    let hasDisplayed = false;
    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isViral = name.includes("VIRAL") || name.includes("TRENDING") || name.includes("HOT");
        
        let shouldShow = (mode === 'foryou') ? true : (mode === 'hot' ? isViral : !isViral);
        
        if (shouldShow && cat.contentInfos?.length) {
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

    if (!hasDisplayed) content.innerHTML = '<p class="py-20 text-center text-xs opacity-30 italic">Konten kosong.</p>';
}

/** * 4. PENCARIAN 
 */
async function performSearch(query) {
    if (!query) return;
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase">Mencari...</div>';
    
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    const items = data?.searchCodeSearchResult || (Array.isArray(data) ? data : []);
    
    content.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">HASIL CARI: ${query.toUpperCase()}</h2></div><div id="searchGrid" class="grid grid-cols-3 gap-3"></div>`;
    const grid = document.getElementById('searchGrid');
    
    if (items.length) items.forEach(item => grid.appendChild(createDramaCard(item)));
    else content.innerHTML = '<p class="py-20 text-center text-xs opacity-30 italic">Drama tidak ditemukan.</p>';
}

/** * 5. HELPER: DRAMA CARD & AUTO-FETCH EPISODE 
 */
function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    // Cek multi-field untuk episode
    const totalEp = item.totalEpisode || item.episodeNum || item.shortPlayEpisodeNum || "??";
    const badgeText = isHist ? `EP ${item.lastEp}` : `${totalEp} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Poster'">
            <div class="ep-badge absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">${badgeText}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 uppercase leading-tight tracking-tighter">${title}</h3>
    `;

    // Jika di halaman awal masih ?? EP, tarik data aslinya di background
    if (!isHist && totalEp === "??") {
        fetchTotalEpisode(id, div.querySelector('.ep-badge'));
    }

    return div;
}

async function fetchTotalEpisode(id, element) {
    try {
        const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
        if (res && res.totalEpisode) element.innerText = `${res.totalEpisode} EP`;
    } catch (e) { element.innerText = "- EP"; }
}

/** * 6. MODAL PLAYER & SINKRONISASI DETAIL 
 */
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = title;
    
    // Loading State
    document.getElementById('modalDesc').innerText = "Memuat deskripsi...";
    document.getElementById('modalTotalEp').innerText = "Memuat total...";

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    // Sinkronisasi shotIntroduce & totalEpisode
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

    if (epData.length > 0) {
        const playIdx = (startEp <= epData.length ? startEp - 1 : 0);
        playEpisode(playIdx);
    }
}

function playEpisode(index) {
    if (!epData[index]) return;
    currentEpIndex = index;
    player.src = epData[index].playVoucher || epData[index].videoUrl;
    player.play();
    if (playIcon) playIcon.className = "fa-solid fa-pause ml-0";

    // Highlight / Tanda Episode Aktif
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

    // Save History (Maksimal 6 & Terlama dihapus)
    const item = { ...currentDramaInfo, lastEp: index + 1, time: Date.now() };
    history = [item, ...history.filter(h => h.id !== item.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

/** * 7. LIBRARY & BOOKMARK 
 */
function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-10">
            <section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Terakhir Ditonton (Maks 6)</h2><div id="hGrid" class="grid grid-cols-3 gap-3"></div></section>
            <section><h2 class="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Koleksi Bookmark</h2><div id="bGrid" class="grid grid-cols-3 gap-3"></div></section>
        </div>`;
    const hGrid = document.getElementById('hGrid'), bGrid = document.getElementById('bGrid');
    history.forEach(item => hGrid.appendChild(createDramaCard(item, true)));
    bookmarks.forEach(item => bGrid.appendChild(createDramaCard(item)));
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

/** * 8. CONTROLS & UTILS 
 */
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    switchView('home', document.querySelector('.nav-item'));
});

