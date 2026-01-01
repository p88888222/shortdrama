const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let currentDramaInfo = null;

const player = document.getElementById('mainPlayer');
const playIcon = document.getElementById('playIcon');

/** 1. FUNGSI UTAMA LOAD DATA */
async function switchView(mode, el) {
    // UI Update
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs">SINKRONISASI DATA...</div>';

    if (mode === 'library') return loadLibrary();

    // Endpoint selection
    const path = (mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    
    if (!data) {
        content.innerHTML = '<p class="text-center py-20 text-xs opacity-50">Gagal memuat data. Periksa koneksi.</p>';
        return;
    }

    renderContent(data, mode);
}

/** 2. RENDERER KONTEN */
function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    
    // Normalisasi data: API bisa mengirim objek langsung atau array
    let categories = [];
    if (Array.isArray(data)) {
        categories = data;
    } else if (data.contentInfos) {
        categories = [data];
    }

    let hasDisplayed = false;

    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const items = cat.contentInfos || [];
        
        // Logika Filter: Jika tab 'hot', cari yang ada kata Viral/Hot. 
        // Jika tab 'home', tampilkan yang bukan Hot. 
        // Jika tab 'foryou', tampilkan semua.
        let shouldShow = false;
        if (mode === 'foryou') shouldShow = true;
        else if (mode === 'hot') shouldShow = (name.includes('HOT') || name.includes('VIRAL') || name.includes('TRENDING'));
        else shouldShow = !(name.includes('HOT') || name.includes('VIRAL') || name.includes('TRENDING'));

        if (shouldShow && items.length > 0) {
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
            items.forEach(item => grid.appendChild(createDramaCard(item)));
            content.appendChild(section);
            hasDisplayed = true;
        }
    });

    // FALLBACK: Jika tab tertentu kosong setelah filter, tampilkan kategori apa saja yang ada
    if (!hasDisplayed && categories.length > 0) {
        const firstCat = categories[0];
        const section = document.createElement('section');
        section.innerHTML = `
            <div class="flex items-center gap-2 mb-4"><div class="w-1 h-3 bg-red-600 rounded-full"></div><h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">REKOMENDASI</h2></div>
            <div class="grid grid-cols-3 gap-3"></div>
        `;
        const grid = section.querySelector('.grid');
        firstCat.contentInfos.forEach(item => grid.appendChild(createDramaCard(item)));
        content.appendChild(section);
    }
}

/** 3. CARD DRAMA & SINKRONISASI EPISODE */
function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    // Sinkronisasi angka episode
    const totalEp = item.totalEpisode || item.episodeNum || "??";
    const badgeText = isHist ? `EP ${item.lastEp}` : `${totalEp} EP`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 mb-1 relative border border-white/5">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy">
            <div class="ep-badge absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">${badgeText}</div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 uppercase leading-tight">${title}</h3>
    `;

    // Jika total episode ??, tarik data asli di background
    if (totalEp === "??" || totalEp === 0) {
        fetchTotalEpisode(id, div.querySelector('.ep-badge'));
    }

    return div;
}

async function fetchTotalEpisode(id, el) {
    try {
        const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
        if (res && res.totalEpisode) el.innerText = `${res.totalEpisode} EP`;
    } catch (e) {}
}

/** 4. DETAIL & PLAYER SINKRONISASI */
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Memuat deskripsi...";
    
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    // Sinkronisasi data detail
    const intro = res?.shotIntroduce || "Tidak ada deskripsi.";
    const total = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];

    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;
    
    currentDramaInfo = { id, title, total, cover, intro };

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs border border-white/5";
        btn.onclick = () => playEpisode(i);
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    if (epData.length > 0) {
        const idx = (startEp <= epData.length) ? startEp - 1 : 0;
        playEpisode(idx);
    }
}

function playEpisode(index) {
    if (!epData[index]) return;
    currentEpIndex = index;
    player.src = epData[index].playVoucher || epData[index].videoUrl;
    player.play();

    // Highlight aktif
    document.querySelectorAll('[id^="ep-btn-"]').forEach(b => b.classList.remove('ep-active'));
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.add('ep-active');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // History (Limit 6)
    const item = { ...currentDramaInfo, lastEp: index + 1, time: Date.now() };
    history = [item, ...history.filter(h => h.id !== item.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

/** 5. SEARCH & LIBRARY */
async function performSearch(query) {
    if (!query) return;
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase">Mencari...</div>';
    
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    const items = data?.searchCodeSearchResult || (Array.isArray(data) ? data : []);
    
    content.innerHTML = `<h2 class="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-widest">HASIL CARI: ${query}</h2><div id="searchGrid" class="grid grid-cols-3 gap-3"></div>`;
    const grid = document.getElementById('searchGrid');
    if (items.length) items.forEach(item => grid.appendChild(createDramaCard(item)));
    else content.innerHTML = '<p class="text-center py-20 text-xs opacity-50">Tidak ditemukan.</p>';
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-8">
            <section><h2 class="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-widest">Riwayat (Maks 6)</h2><div id="hGrid" class="grid grid-cols-3 gap-3"></div></section>
            <section><h2 class="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-widest">Bookmark</h2><div id="bGrid" class="grid grid-cols-3 gap-3"></div></section>
        </div>`;
    history.forEach(i => document.getElementById('hGrid').appendChild(createDramaCard(i, true)));
    bookmarks.forEach(i => document.getElementById('bGrid').appendChild(createDramaCard(i)));
}

/** 6. UTILS */
async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { return null; }
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    player.pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    switchView('foryou', document.querySelector('.nav-item'));
});

