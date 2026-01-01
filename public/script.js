const API_BASE = "/api-proxy";
let epData = [];
let currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

/**
 * 1. FUNGSI NAVIGASI UTAMA
 */
async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold uppercase tracking-widest text-xs">Menghubungkan Database...</div>';

    if (mode === 'home') loadHome();
    else if (mode === 'hot') loadHot();
    else if (mode === 'library') loadLibrary();
}

/**
 * 2. HOME: MEMBAGI BERDASARKAN KATEGORI (contentName)
 */
async function loadHome() {
    const data = await apiGet('/netshort/theaters');
    const content = document.getElementById('appContent');
    content.innerHTML = "";

    // Data theaters biasanya berupa array grup kategori
    if (Array.isArray(data)) {
        data.forEach(category => {
            const section = document.createElement('section');
            section.className = "space-y-4";
            
            const title = document.createElement('div');
            title.className = "flex items-center gap-2 mb-4";
            title.innerHTML = `<div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${category.contentName || 'KATEGORI'}</h2>`;
            section.appendChild(title);

            const grid = document.createElement('div');
            grid.className = "grid grid-cols-3 gap-3";
            
            (category.contentInfos || []).forEach(item => {
                grid.appendChild(createDramaCard(item));
            });

            section.appendChild(grid);
            content.appendChild(section);
        });
    } else {
        renderStandardGrid(data);
    }
}

async function loadHot() {
    const data = await apiGet('/netshort/foryou');
    renderStandardGrid(data);
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-10">
            <section>
                <div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terakhir Ditonton</h2></div>
                <div id="historyGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
            <section>
                <div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Koleksi Saya</h2></div>
                <div id="bookmarkGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
        </div>
    `;
    const histGrid = document.getElementById('historyGrid');
    const bookGrid = document.getElementById('bookmarkGrid');
    
    if (history.length) history.forEach(item => histGrid.appendChild(createDramaCard(item)));
    else histGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-30 italic py-4">Belum ada riwayat nonton.</p>';
    
    if (bookmarks.length) bookmarks.forEach(item => bookGrid.appendChild(createDramaCard(item)));
    else bookGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-30 italic py-4">Belum ada bookmark.</p>';
}

/**
 * 3. HELPER RENDER CARD & GRID
 */
function createDramaCard(item) {
    const spId = item.shortPlayId || item.id;
    const spName = item.shortPlayName || item.title || item.bookName;
    const spTotal = item.totalEpisode || item.episodeNum || "??";
    const spIntro = (item.shotIntroduce || item.shortIntroduce || "").replace(/"/g, '&quot;');
    
    const rawCover = item.shortPlayCover || item.groupShortPlayCover || item.cover;
    const finalCover = rawCover?.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover?.startsWith('/') ? '' : '/'}${rawCover}`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all duration-200";
    div.onclick = () => openDetail(spId, spName, spIntro, spTotal);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">${spTotal} EP</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 px-1 uppercase leading-tight tracking-tighter">${spName}</h3>`;
    return div;
}

function renderStandardGrid(dataObj) {
    const content = document.getElementById('appContent');
    const label = dataObj?.contentName || "DRAMA POPULER";
    content.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${label}</h2></div><div id="gridBody" class="grid grid-cols-3 gap-3"></div>`;
    
    const gridBody = document.getElementById('gridBody');
    let items = dataObj?.contentInfos || (Array.isArray(dataObj) ? dataObj : []);
    items.forEach(item => gridBody.appendChild(createDramaCard(item)));
}

/**
 * 4. PLAYER & DETAIL LOGIC
 */
async function openDetail(id, title, intro, total) {
    const modal = document.getElementById('detailModal');
    const player = document.getElementById('mainPlayer');
    player.pause(); player.src = ""; player.load();

    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<p class="text-center py-5 text-xs text-red-600 animate-pulse font-bold uppercase">Memuat Episode...</p>';

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || [];
    
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex items-center justify-between text-xs border border-white/5 mb-1";
        btn.onclick = () => {
            player.src = ep.playVoucher || ep.videoUrl;
            player.play();
            currentEpIndex = i;
            saveHistory(id, title, total, i+1);
        };
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 opacity-20 text-[10px]"></i>`;
        epList.appendChild(btn);
    });
}

function saveHistory(id, title, total, ep) {
    const item = { id, title, totalEpisode: total, lastEp: ep, time: Date.now() };
    history = history.filter(h => h.id !== id);
    history.unshift(item);
    if (history.length > 9) history.pop();
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

function playSibling(dir) {
    const next = currentEpIndex + dir;
    if (next >= 0 && next < epData.length) {
        const player = document.getElementById('mainPlayer');
        player.src = epData[next].playVoucher || epData[next].videoUrl;
        player.play();
        currentEpIndex = next;
    }
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => switchView('home', document.querySelector('.nav-item')));

