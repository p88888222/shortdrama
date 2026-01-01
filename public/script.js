const API_BASE = "/api-proxy";
let epData = [];
let currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

// Fungsi Utama Navigasi
async function switchView(mode, el) {
    // Reset status aktif tombol navigasi
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold uppercase tracking-widest text-xs">Memuat Drama...</div>';

    if (mode === 'home') loadHome();
    else if (mode === 'hot') loadHot();
    else if (mode === 'library') loadLibrary();
}

// 1. HOME: Menampilkan Terbaru & Pilihan
async function loadHome() {
    const data = await apiGet('/netshort/theaters');
    const content = document.getElementById('appContent');
    content.innerHTML = "";

    if (Array.isArray(data) && data.length > 0) {
        let found = false;
        data.forEach(category => {
            const name = (category.contentName || "").toUpperCase();
            // Filter: Jangan tampilkan yang Viral/Hot di Home
            if (!name.includes("HOT") && !name.includes("VIRAL") && !name.includes("TRENDING")) {
                renderSection(category, content);
                found = true;
            }
        });
        // Jika filter terlalu ketat sehingga kosong, tampilkan semua saja
        if (!found) renderStandardGrid(data, "SEMUA DRAMA");
    } else {
        content.innerHTML = '<div class="py-20 text-center text-xs opacity-50">Gagal memuat data Home.</div>';
    }
}

// 2. HOT: Menampilkan Viral & Trending
async function loadHot() {
    const data = await apiGet('/netshort/foryou');
    const content = document.getElementById('appContent');
    content.innerHTML = "";

    if (Array.isArray(data) && data.length > 0) {
        let found = false;
        data.forEach(category => {
            const name = (category.contentName || "").toUpperCase();
            if (name.includes("HOT") || name.includes("VIRAL") || name.includes("TRENDING") || name.includes("POPULER")) {
                renderSection(category, content);
                found = true;
            }
        });
        if (!found) renderStandardGrid(data, "TRENDING SEKARANG");
    } else {
        renderStandardGrid(data, "TRENDING SEKARANG");
    }
}

// 3. LIBRARY: Perbaikan Gambar & Episode
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
        </div>`;

    const histGrid = document.getElementById('historyGrid');
    if (history.length > 0) {
        history.forEach(item => histGrid.appendChild(createDramaCard(item, true)));
    } else {
        histGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-30 italic py-4 text-center">Belum ada riwayat.</p>';
    }
}

// Fungsi Helper Render
function renderSection(category, container) {
    const section = document.createElement('section');
    section.className = "mb-8";
    section.innerHTML = `
        <div class="flex items-center gap-2 mb-4">
            <div class="w-1 h-3 bg-red-600 rounded-full"></div>
            <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${category.contentName}</h2>
        </div>
        <div class="grid grid-cols-3 gap-3"></div>`;
    const grid = section.querySelector('.grid');
    (category.contentInfos || []).forEach(item => grid.appendChild(createDramaCard(item)));
    container.appendChild(section);
}

function renderStandardGrid(data, label) {
    const content = document.getElementById('appContent');
    content.innerHTML = `<div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${label}</h2></div><div id="fallbackGrid" class="grid grid-cols-3 gap-3"></div>`;
    const grid = document.getElementById('fallbackGrid');
    const items = Array.isArray(data) ? data.flatMap(d => d.contentInfos || d) : (data.contentInfos || []);
    items.forEach(item => grid.appendChild(createDramaCard(item)));
}

function createDramaCard(item, isHistory = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || "No Title";
    const cover = item.shortPlayCover || item.cover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    // Logika Episode
    const badge = isHistory ? `EP ${item.lastEp}` : `${item.totalEpisode || item.episodeNum || '??'} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, item.shotIntroduce || item.intro || "", item.totalEpisode || "", finalCover);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5">
            <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">${badge}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 px-1 uppercase leading-tight">${title}</h3>`;
    return div;
}

async function openDetail(id, title, intro, total, cover) {
    const modal = document.getElementById('detailModal');
    const player = document.getElementById('mainPlayer');
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
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs border border-white/5 mb-1";
        btn.onclick = () => {
            player.src = ep.playVoucher || ep.videoUrl;
            player.play();
            currentEpIndex = i;
            // Simpan ke history beserta cover-nya agar tidak broken
            saveHistory(id, title, total, i+1, cover);
        };
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });
}

function saveHistory(id, title, total, ep, cover) {
    const item = { id, title, totalEpisode: total, lastEp: ep, cover: cover, time: Date.now() };
    history = history.filter(h => h.id !== id);
    history.unshift(item);
    if (history.length > 12) history.pop();
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => switchView('home', document.querySelector('.nav-item')));

