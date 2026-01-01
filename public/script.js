const API_BASE = "/api-proxy";
let epData = []; // Menyimpan list episode drama yang sedang dibuka
let currentEpIndex = -1;

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

async function performSearch(query) {
    if (!query) return;
    const container = document.getElementById('mainContainer');
    document.getElementById('sectionLabel').innerText = `HASIL CARI: ${query.toUpperCase()}`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs text-red-600 animate-pulse">MENCARI...</div>';
    
    const res = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    // Menangani struktur searchCodeSearchResult dari API Search
    const items = res?.searchCodeSearchResult || res;
    renderGrid(items, 'search');
}

async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active'));
        el.classList.add('tab-active');
    }
    const container = document.getElementById('mainContainer');
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs text-red-600 animate-pulse">MEMUAT...</div>';
    const path = (type === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderGrid(data, type);
}

function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    if (type !== 'search') label.innerText = dataObj?.contentName || type.toUpperCase();

    let items = [];
    if (dataObj?.contentInfos) items = dataObj.contentInfos;
    else if (Array.isArray(dataObj)) items = dataObj[0]?.contentInfos ? dataObj.flatMap(g => g.contentInfos || []) : dataObj;
    else if (dataObj?.searchCodeSearchResult) items = dataObj.searchCodeSearchResult;

    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50 text-xs">Tidak ditemukan.</p>';
    
    items.forEach(item => {
        const id = item.shortPlayId || item.id;
        const title = item.shortPlayName || item.title;
        // AMBIL DATA DARI CONTOH RESPONS: shotIntroduce & totalEpisode
        const totalEp = item.totalEpisode || item.episodeNum || "0";
        const desc = item.shotIntroduce || item.shortIntroduce || "";
        const tags = Array.isArray(item.shortPlayLabels) ? item.shortPlayLabels.join(" • ") : "";

        const rawCover = item.shortPlayCover || item.groupShortPlayCover || item.cover;
        const finalCover = rawCover?.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover?.startsWith('/') ? '' : '/'}${rawCover}`;

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp";
        div.onclick = () => openDetail(id, title, desc, totalEp, tags);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
                <img src="${finalCover}" class="w-full h-full object-cover">
                <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white">
                    ${totalEp} EP
                </div>
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 uppercase leading-tight">${title}</h3>`;
        container.appendChild(div);
    });
}

async function openDetail(id, title, desc, totalEp, tags) {
    const modal = document.getElementById('detailModal');
    const player = document.getElementById('mainPlayer');
    
    // Reset State
    player.pause(); player.src = ""; player.load();
    epData = []; currentEpIndex = -1;

    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    document.getElementById('modalTotalEp').innerText = `${totalEp} TOTAL EPISODE`;
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<p class="text-center py-5 text-xs text-red-600 animate-pulse font-bold">MEMUAT EPISODE...</p>';

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || [];
    
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "ep-item w-full text-left bg-white/5 p-4 rounded-xl flex items-center justify-between text-xs border border-white/5 mb-1 active:bg-red-600/20";
        btn.onclick = () => playEpisode(i);
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 opacity-30"></i>`;
        epList.appendChild(btn);
    });

    // Putar episode 1 secara otomatis saat dibuka
    if(epData.length > 0) playEpisode(0);
}

function playEpisode(index) {
    if (index < 0 || index >= epData.length) return;
    
    currentEpIndex = index;
    const player = document.getElementById('mainPlayer');
    const ep = epData[index];
    
    player.src = ep.playVoucher || ep.videoUrl;
    player.play();

    // Tandai episode yang aktif di list
    document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('bg-red-600/20', 'border-red-600/50'));
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if(activeBtn) activeBtn.classList.add('bg-red-600/20', 'border-red-600/50');
}

// Navigasi Prev/Next
function playSibling(direction) {
    const nextIdx = currentEpIndex + direction;
    if (nextIdx >= 0 && nextIdx < epData.length) {
        playEpisode(nextIdx);
        // Scroll ke tombol episode yang aktif agar terlihat
        document.getElementById(`ep-btn-${nextIdx}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function closeModal() {
    const player = document.getElementById('mainPlayer');
    document.getElementById('detailModal').classList.add('hidden');
    player.pause(); player.src = "";
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    changeTab('foryou');
});
