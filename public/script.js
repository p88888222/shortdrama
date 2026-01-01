const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1, controlTimeout;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');
let activeDrama = null;

const player = document.getElementById('mainPlayer');
const playIcon = document.getElementById('playIcon');
const videoControls = document.getElementById('videoControls');
const seekBar = document.getElementById('seekBar');

// --- HELPER API ---
async function apiGet(path) {
    try {
        const r = await fetch(`${API_BASE}${path}`);
        const j = await r.json(); 
        return j.data || j;
    } catch (e) { return null; }
}

// --- NAVIGASI & RENDER ---
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

function renderContent(data, mode) {
    const content = document.getElementById('appContent');
    content.innerHTML = "";
    
    // Memastikan data diproses sebagai array kategori
    let categories = Array.isArray(data) ? data : (data.contentInfos ? [data] : []);

    let hasDisplayed = false;
    
    // Logika penentuan tampilan tiap tab
    categories.forEach(cat => {
        const name = (cat.contentName || "").toUpperCase();
        const isHotCategory = name.includes("VIRAL") || name.includes("HOT") || name.includes("TRENDING") || name.includes("POPULAR");
        
        let shouldShow = false;
        if (mode === 'foryou') {
            shouldShow = true; // For You tampilkan semua
        } else if (mode === 'hot') {
            shouldShow = isHotCategory; // Hot tampilkan kategori viral
        } else {
            shouldShow = !isHotCategory; // Home tampilkan sisanya
        }

        if (shouldShow && cat.contentInfos?.length) {
            const section = document.createElement('section');
            section.className = "mb-8 animate-fade-in";
            section.innerHTML = `
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest">${cat.contentName}</h2>
                </div>
                <div class="grid grid-cols-3 gap-3"></div>
            `;
            cat.contentInfos.forEach(item => section.querySelector('.grid').appendChild(createDramaCard(item)));
            content.appendChild(section);
            hasDisplayed = true;
        }
    });

    // FALLBACK: Jika tab masih kosong, tampilkan semua drama yang ada agar tidak blank
    if (!hasDisplayed && categories.length > 0) {
        categories.forEach(cat => {
            const section = document.createElement('section');
            section.className = "mb-8";
            section.innerHTML = `
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-500 uppercase tracking-widest">${cat.contentName}</h2>
                </div>
                <div class="grid grid-cols-3 gap-3"></div>
            `;
            cat.contentInfos.forEach(item => section.querySelector('.grid').appendChild(createDramaCard(item)));
            content.appendChild(section);
        });
    }
}

function createDramaCard(item, isHist = false) {
    const id = item.shortPlayId || item.id;
    const title = item.shortPlayName || item.title || item.bookName;
    const cover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = cover?.startsWith('http') ? cover : `https://api.sansekai.my.id${cover?.startsWith('/') ? '' : '/'}${cover}`;
    
    const totalEp = item.totalEpisode || item.episodeNum || 0;

    const div = document.createElement('div');
    div.className = "drama-card";
    div.onclick = () => openDetail(id, title, finalCover, isHist ? item.lastEp : 1);
    div.innerHTML = `
        <div class="card-img-container aspect-[3/4.2]">
            <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy">
            <div class="card-badge glass-dark">
                <span class="ep-badge-text">${totalEp > 0 ? totalEp + ' EP' : 'Sync...'}</span>
            </div>
        </div>
        <h3 class="mt-3 text-[9px] font-bold text-gray-400 line-clamp-2 leading-tight uppercase">${title}</h3>
    `;

    if (totalEp === 0) fetchActualEpisode(id, div.querySelector('.ep-badge-text'));
    return div;
}

async function fetchActualEpisode(id, el) {
    try {
        const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
        if (res && res.totalEpisode && el) {
            el.innerText = res.totalEpisode + " EP";
        }
    } catch (e) {}
}

// --- MODAL & PLAYER DETAIL ---
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    if (player) { player.pause(); player.src = ""; }
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    showControls();

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = "Memuat deskripsi...";
    document.getElementById('modalTotalEp').innerText = "... EPISODES";
    document.getElementById('modalEpisodes').innerHTML = "";

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    // Sinkronisasi data detail
    epData = res?.shortPlayEpisodeInfos || [];
    activeDrama = { 
        id, title, cover, 
        intro: res?.shotIntroduce || "Deskripsi tidak tersedia.",
        total: res?.totalEpisode || epData.length || 0
    };

    document.getElementById('modalDesc').innerText = activeDrama.intro;
    document.getElementById('modalTotalEp').innerText = `${activeDrama.total} EPISODES`;
    updateBookmarkUI();

    const epList = document.getElementById('modalEpisodes');
    if (epData.length > 0) {
        epData.forEach((ep, i) => {
            const btn = document.createElement('button');
            btn.id = `ep-btn-${i}`;
            btn.className = "ep-btn w-full text-left glass p-4 rounded-xl flex justify-between items-center text-xs";
            btn.onclick = () => playEp(i);
            btn.innerHTML = `<span class="font-bold">EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-500 text-[10px]"></i>`;
            epList.appendChild(btn);
        });
        playEp(startEp - 1);
    } else {
        epList.innerHTML = "<p class='text-xs text-center opacity-30 py-10'>Daftar episode tidak ditemukan.</p>";
    }
}

// --- SISTEM PLAYER & RIWAYAT ---
function playEp(idx) {
    if (!epData || !epData[idx]) return;
    currentEpIndex = idx;
    
    const tracks = player.querySelectorAll('track');
    tracks.forEach(t => t.remove());

    player.src = epData[idx].playVoucher || epData[idx].videoUrl;
    
    if (epData[idx].subtitleUrl || epData[idx].m3u8SubtitleUrl) {
        const t = document.createElement('track');
        t.kind = "subtitles"; t.label = "Indo"; t.srclang = "id"; t.default = true;
        t.src = epData[idx].subtitleUrl || epData[idx].m3u8SubtitleUrl;
        player.appendChild(t);
    }

    player.load();
    player.play();
    if (playIcon) playIcon.className = "fa-solid fa-pause";

    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('ep-active'));
    document.getElementById(`ep-btn-${idx}`)?.classList.add('ep-active');

    if (activeDrama) {
        const histItem = { ...activeDrama, lastEp: idx + 1 };
        history = [histItem, ...history.filter(h => h.id !== activeDrama.id)].slice(0, 6);
        localStorage.setItem('dramaxin_history', JSON.stringify(history));
    }
}

// (Fungsi togglePlay, toggleFullscreen, formatTime, loadLibrary, performSearch, dll tetap sama)

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').onkeypress = (e) => { 
        if(e.key === 'Enter') performSearch(e.target.value); 
    };
    switchView('home', document.querySelector('.nav-item')); // Mulai dari Home
});

