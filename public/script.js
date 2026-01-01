const API_BASE = "/api-proxy";
let currentPage = 1;
let currentMode = 'home';
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');

// Fungsi Utama Navigasi
async function switchView(mode, el) {
    currentMode = mode;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    el.classList.add('nav-active');
    
    document.getElementById('pagination').classList.add('hidden');
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold">LOADING...</div>';

    if (mode === 'home') {
        loadHome();
    } else if (mode === 'hot') {
        loadHot();
    } else if (mode === 'library') {
        loadLibrary();
    }
}

// Load Beranda dengan Pagination
async function loadHome() {
    const data = await apiGet(`/netshort/theaters?page=${currentPage}`); // Endpoint theater biasanya berisi seluruh drama
    renderGrid(data);
    document.getElementById('pagination').classList.remove('hidden');
    document.getElementById('pageNumber').innerText = `Page ${currentPage}`;
}

// Load Drama Populer
async function loadHot() {
    const data = await apiGet('/netshort/foryou');
    renderGrid(data);
}

// Load Library (Bookmark & History)
function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <h3 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Terakhir Ditonton</h3>
        <div id="historyGrid" class="grid grid-cols-3 gap-3 mb-10"></div>
        
        <h3 class="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Bookmark Saya</h3>
        <div id="bookmarkGrid" class="grid grid-cols-3 gap-3"></div>
    `;
    renderSubGrid(history, 'historyGrid', true);
    renderSubGrid(bookmarks, 'bookmarkGrid', false);
}

// Render Grid Drama
function renderGrid(dataObj) {
    const container = document.getElementById('appContent');
    container.innerHTML = "";
    
    let items = dataObj?.contentInfos || (Array.isArray(dataObj) ? dataObj.flatMap(g => g.contentInfos || []) : []);
    
    items.forEach(item => {
        const div = createDramaCard(item);
        container.appendChild(div);
    });
}

function createDramaCard(item) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title;
    const totalEp = item.totalEpisode || item.episodeNum || "??";
    const cover = item.shortPlayCover || item.cover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover}`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition";
    div.onclick = () => openDetail(id, title, item.shotIntroduce || "", totalEp, item.shortPlayLabels);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 mb-2 relative border border-white/5">
            <img src="${finalCover}" class="w-full h-full object-cover">
            <div class="absolute bottom-2 right-2 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">${totalEp} EP</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 uppercase leading-tight">${title}</h3>
    `;
    return div;
}

// Detail & History Tracking
async function openDetail(id, title, desc, total, labels) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc;
    document.getElementById('modalLabels').innerHTML = labels?.map(l => `<span>${l}</span>`).join(' • ') || "";

    // Toggle Bookmark Button
    const btn = document.getElementById('bookmarkBtn');
    updateBookmarkUI(id);
    btn.onclick = () => toggleBookmark({id, title, total, desc, labels});

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    const eps = res?.shortPlayEpisodeInfos || [];
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    eps.forEach((ep, i) => {
        const btnEp = document.createElement('button');
        btnEp.className = "w-full text-left bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs";
        btnEp.onclick = () => {
            playVideo(ep.playVoucher || ep.videoUrl);
            saveHistory(id, title, i + 1); // Simpan history saat klik episode
        };
        btnEp.innerHTML = `<span>Episode ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 opacity-50"></i>`;
        epList.appendChild(btnEp);
    });
}

// Local Storage Helpers
function saveHistory(id, title, ep) {
    const item = { id, title, lastEp: ep, time: new Date().getTime() };
    history = history.filter(h => h.id !== id);
    history.unshift(item);
    if (history.length > 6) history.pop();
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

function toggleBookmark(drama) {
    const exists = bookmarks.find(b => b.id === drama.id);
    if (exists) bookmarks = bookmarks.filter(b => b.id !== drama.id);
    else bookmarks.unshift(drama);
    localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
    updateBookmarkUI(drama.id);
}

function updateBookmarkUI(id) {
    const icon = document.querySelector('#bookmarkBtn i');
    const isBookmarked = bookmarks.find(b => b.id === id);
    icon.className = isBookmarked ? "fa-solid fa-bookmark text-red-500" : "fa-regular fa-bookmark";
}

// Utility
async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

function switchPage(direction) {
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    loadHome();
    window.scrollTo({top: 0, behavior: 'smooth'});
}

document.getElementById('prevPage').onclick = () => switchPage(-1);
document.getElementById('nextPage').onclick = () => switchPage(1);
document.addEventListener('DOMContentLoaded', () => switchView('home', document.querySelector('.nav-item')));

