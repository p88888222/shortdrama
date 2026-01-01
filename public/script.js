const API_BASE = "/api-proxy";
let epData = [];
let currentEpIndex = -1;

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

async function performSearch(query) {
    if (!query) return;
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    label.innerText = `Search results for "${query}"`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs text-red-600 animate-pulse font-bold uppercase">Searching...</div>';
    
    const res = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    const items = res?.searchCodeSearchResult || (Array.isArray(res) ? res : []);
    renderGrid(items, 'search');
}

async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active'));
        el.classList.add('tab-active');
    }
    const container = document.getElementById('mainContainer');
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs text-red-600 animate-pulse font-bold uppercase">Syncing...</div>';
    const path = (type === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderGrid(data, type);
}

function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    
    const categoryTitle = dataObj?.contentName || (Array.isArray(dataObj) ? dataObj[0]?.contentName : null) || type.toUpperCase();
    label.innerText = categoryTitle;

    let items = [];
    if (dataObj?.contentInfos) {
        items = dataObj.contentInfos;
    } else if (Array.isArray(dataObj)) {
        items = dataObj[0]?.contentInfos ? dataObj.flatMap(g => g.contentInfos || []) : dataObj;
    }

    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50 text-xs">No dramas found.</p>';
    
    items.forEach(item => {
        // Sinkronisasi data API (shotIntroduce & totalEpisode)
        const spId = item.shortPlayId || item.id;
        const spName = item.shortPlayName || item.title || "No Title";
        const spIntro = item.shotIntroduce || item.shortIntroduce || "Description not available.";
        const spTotal = item.totalEpisode || item.episodeNum || "0";

        const rawCover = item.shortPlayCover || item.groupShortPlayCover || item.cover;
        const finalCover = rawCover?.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover?.startsWith('/') ? '' : '/'}${rawCover}`;

        const div = document.createElement('div');
        div.className = "cursor-pointer group active:scale-95 transition-transform duration-200";
        div.onclick = () => openDetail(spId, spName, spIntro, spTotal);
        div.innerHTML = `
            <div class="aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800 mb-2 relative border border-white/5 shadow-xl">
                <img src="${finalCover}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy">
                <div class="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[8px] font-black px-1.5 py-0.5 rounded-lg text-white uppercase">
                    HD
                </div>
                <div class="absolute bottom-2 right-2 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded-lg text-white shadow-lg">
                    ${spTotal} EP
                </div>
            </div>
            <h3 class="text-[10px] font-bold line-clamp-2 text-gray-300 px-1 uppercase leading-tight tracking-tight">${spName}</h3>`;
        container.appendChild(div);
    });
}

async function openDetail(id, title, intro, total) {
    const modal = document.getElementById('detailModal');
    const player = document.getElementById('mainPlayer');
    
    player.pause(); player.src = ""; player.load();
    epData = []; currentEpIndex = -1;

    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = intro; 
    document.getElementById('modalTotalEp').innerText = `${total} Episodes`; 
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<p class="text-center py-5 text-xs text-red-600 animate-pulse font-bold">LOADING...</p>';

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || [];
    
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "ep-item w-full text-left bg-white/5 p-4 rounded-2xl flex items-center justify-between text-xs border border-white/5 mb-2 active:bg-red-600/20 transition-all";
        btn.onclick = () => playEpisode(i);
        btn.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg glass-panel flex items-center justify-center text-[9px] font-black">${i+1}</span>
                <span class="font-bold">Episode ${ep.episodeNo || i+1}</span>
            </div>
            <i class="fa-solid fa-circle-play text-red-600 text-lg opacity-40"></i>`;
        epList.appendChild(btn);
    });

    if(epData.length > 0) playEpisode(0);
}

function playEpisode(index) {
    if (index < 0 || index >= epData.length) return;
    currentEpIndex = index;
    const player = document.getElementById('mainPlayer');
    const playIcon = document.getElementById('playIcon');
    
    player.src = epData[index].playVoucher || epData[index].videoUrl;
    player.play();
    if(playIcon) playIcon.className = "fa-solid fa-pause text-lg";

    document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('bg-red-600/20', 'border-red-600/40'));
    const activeBtn = document.getElementById(`ep-btn-${index}`);
    if(activeBtn) {
        activeBtn.classList.add('bg-red-600/20', 'border-red-600/40');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function togglePlay() {
    const player = document.getElementById('mainPlayer');
    const playIcon = document.getElementById('playIcon');
    if (player.paused) { player.play(); playIcon.className = "fa-solid fa-pause text-lg"; }
    else { player.pause(); playIcon.className = "fa-solid fa-play ml-1 text-lg"; }
}

function changeVolume(val) { document.getElementById('mainPlayer').volume = val; }

function toggleFullscreen() {
    const player = document.getElementById('mainPlayer');
    if (player.requestFullscreen) player.requestFullscreen();
    else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
}

function changeQuality() {
    const player = document.getElementById('mainPlayer');
    const curTime = player.currentTime;
    player.load(); player.currentTime = curTime; player.play();
}

function playSibling(direction) {
    const nextIdx = currentEpIndex + direction;
    if (nextIdx >= 0 && nextIdx < epData.length) playEpisode(nextIdx);
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch(e.target.value);
        });
    }
    changeTab('foryou');
});

