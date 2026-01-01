const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let activeDrama = null;

async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); return j.data || j;
    } catch (e) { return null; }
}

async function switchView(mode, el) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    if (el) el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold text-xs uppercase">Loading...</div>';

    if (mode === 'library') return loadLibrary();

    const path = (mode === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderContent(data, mode);
}

function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    let cats = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    let displayed = false;
    cats.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isHot = name.includes("VIRAL") || name.includes("HOT") || name.includes("POPULAR") || name.includes("TRENDING");
        
        let show = (mode === 'foryou') ? true : (mode === 'hot' ? isHot : !isHot);

        if (show && cat.contentInfos?.length) {
            const sec = document.createElement('section');
            sec.className = "mb-8";
            sec.innerHTML = `
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest">${cat.contentName}</h2>
                </div>
                <div class="grid grid-cols-3 gap-3"></div>
            `;
            cat.contentInfos.forEach(item => sec.querySelector('.grid').appendChild(createDramaCard(item)));
            content.appendChild(sec);
            displayed = true;
        }
    });

    if (!displayed && cats.length > 0) renderContent(cats, 'foryou');
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    // Tampilan Episode di List (Biarkan apa adanya dari API agar stabil)
    const totalEp = item.totalEpisode || item.episodeNum || "??";

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden glass mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">
                ${isHist ? 'EP '+item.lastEp : totalEp + ' EP'}
            </div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 uppercase leading-tight">${title}</h3>
    `;
    return div;
}
async function fetchTotalEpisode(id, element) {
    try {
        const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
        if (res && res.totalEpisode) {
            element.innerText = `${res.totalEpisode} EP`;
            
            // Opsional: Simpan ke cache sementara agar tidak fetch ulang saat scroll
            // Ini akan membuat aplikasi terasa sangat cepat
        }
    } catch (e) {
        // Jika gagal, biarkan tetap ?? atau ubah jadi -
    }
}

async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    const player = document.getElementById('mainPlayer');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Memuat...";

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    const intro = res?.shotIntroduce || "Tidak ada deskripsi.";
    const total = res?.totalEpisode || "0";
    epData = res?.shortPlayEpisodeInfos || [];
    
    activeDrama = { id, title, cover, intro, total };

    document.getElementById('modalDesc').innerText = intro;
    document.getElementById('modalTotalEp').innerText = `${total} TOTAL EPISODE`;
    updateBookmarkUI();

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left glass p-4 rounded-xl flex justify-between items-center text-xs";
        btn.onclick = () => playEp(i);
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 text-[10px]"></i>`;
        epList.appendChild(btn);
    });

    if (epData.length > 0) playEp(startEp - 1);
}

function playEp(idx) {
    if (!epData[idx]) return;
    currentEpIndex = idx;
    const player = document.getElementById('mainPlayer');
    player.src = epData[idx].playVoucher || epData[idx].videoUrl;
    player.play();

    document.querySelectorAll('[id^="ep-btn-"]').forEach(b => b.classList.remove('ep-active'));
    const active = document.getElementById(`ep-btn-${idx}`);
    if (active) {
        active.classList.add('ep-active');
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Save History (Maks 6)
    const histItem = { ...activeDrama, lastEp: idx + 1 };
    history = [histItem, ...history.filter(h => h.id !== activeDrama.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

function updateBookmarkUI() {
    const isBook = bookmarks.find(b => b.id === activeDrama.id);
    document.getElementById('modalAction').innerHTML = `
        <button onclick="toggleBook()" class="w-10 h-10 glass rounded-full flex items-center justify-center">
            <i class="fa-${isBook ? 'solid' : 'regular'} fa-bookmark ${isBook ? 'text-red-500' : ''}"></i>
        </button>
    `;
}

function toggleBook() {
    const idx = bookmarks.findIndex(b => b.id === activeDrama.id);
    if (idx > -1) bookmarks.splice(idx, 1);
    else bookmarks.unshift(activeDrama);
    localStorage.setItem('dramaxin_bookmarks', JSON.stringify(bookmarks));
    updateBookmarkUI();
}

function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-12 pb-20">
            <section><h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">History (Maks 6)</h2><div id="hG" class="grid grid-cols-3 gap-3"></div></section>
            <section><h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Bookmark</h2><div id="bG" class="grid grid-cols-3 gap-3"></div></section>
        </div>
    `;
    const hG = document.getElementById('hG'), bG = document.getElementById('bG');
    if (history.length) history.forEach(h => hG.appendChild(createDramaCard(h, true)));
    else hG.innerHTML = '<p class="text-xs text-center opacity-30 py-4">Belum ada riwayat.</p>';
    if (bookmarks.length) bookmarks.forEach(b => bG.appendChild(createDramaCard(b)));
    else bG.innerHTML = '<p class="text-xs text-center opacity-30 py-4">Koleksi kosong.</p>';
}

async function performSearch(q) {
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center text-red-600 font-bold text-xs">MENCARI...</div>';
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(q)}`);
    const items = data?.searchCodeSearchResult || [];
    content.innerHTML = `<h2 class="text-[10px] font-black text-gray-500 mb-6 uppercase tracking-widest">Hasil: ${q}</h2><div id="sG" class="grid grid-cols-3 gap-3 pb-24"></div>`;
    if (items.length) items.forEach(i => document.getElementById('sG').appendChild(createDramaCard(i)));
    else content.innerHTML = '<p class="text-xs text-center opacity-30 py-10">Tidak ditemukan.</p>';
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
    switchView('home', document.querySelector('.nav-item'));
});

