const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

// FUNGSI PENCARIAN
async function performSearch(query) {
    if (!query) return;
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    
    label.innerText = `MENCARI: ${query.toUpperCase()}`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs animate-pulse text-red-600 font-bold">MENCARI DI DATABASE...</div>';

    const response = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    renderGrid(response, 'search');
}

async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active', 'text-white'));
        el.classList.add('tab-active', 'text-white');
    }
    const container = document.getElementById('mainContainer');
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs animate-pulse text-red-600">SINKRONISASI DATA...</div>';

    const path = (type === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderGrid(data, type);
}

function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    
    if (type !== 'search') label.innerText = dataObj?.contentName || type.toUpperCase();
    
    let items = dataObj?.contentInfos || (Array.isArray(dataObj) ? dataObj : []);
    if (dataObj?.[0]?.contentInfos) items = dataObj.flatMap(g => g.contentInfos || []);

    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50 text-xs">Data Tidak Ditemukan</p>';
    
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title;
        const totalEp = item.totalEpisode || item.episodeNum || "??";
        const desc = item.shotIntroduce || item.shortIntroduce || "";
        const tags = Array.isArray(item.shortPlayLabels) ? item.shortPlayLabels.join(" • ") : "";

        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.coverWap || item.cover;
        let finalCover = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover.startsWith('/') ? '' : '/'}${rawCover}`) : 'https://via.placeholder.com/300x400';

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, desc, totalEp, tags);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 mb-1.5 relative border border-white/5 shadow-lg active:scale-95 transition-all">
                <img src="${finalCover}" class="w-full h-full object-cover">
                <div class="absolute bottom-2 right-2 bg-red-600 text-[8px] font-black px-2 py-1 rounded text-white shadow-xl">
                    ${totalEp} EP
                </div>
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-500 px-1 leading-tight uppercase">${title}</h3>`;
        container.appendChild(div);
    });
}

async function openDetail(id, title, desc, totalEp, tags) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Tidak ada deskripsi.";
    document.getElementById('modalTotalEp').innerText = `${totalEp} TOTAL EPISODE`;
    
    const labelContainer = document.getElementById('modalLabels');
    labelContainer.innerHTML = tags.split(' • ').map(t => `<span class="bg-red-600/10 text-red-500 text-[8px] font-bold px-2 py-1 rounded border border-red-500/10">${t}</span>`).join('');
    
    document.getElementById('playerContainer').classList.add('hidden');
    const player = document.getElementById('mainPlayer');
    player.pause(); player.src = "";

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<div class="py-10 text-center text-xs animate-pulse text-red-500 font-bold">MENGHUBUNGKAN EPISODE...</div>';

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || res?.data || [];
    
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between mb-1 active:bg-red-600/20 transition-all";
        btn.onclick = () => playEp(i);
        btn.innerHTML = `
            <div class="flex flex-col gap-1">
                <span class="font-bold text-xs text-gray-200 uppercase">EPISODE ${ep.episodeNo || i+1}</span>
                <span class="text-[8px] text-gray-500 font-bold uppercase tracking-widest"><i class="fa-solid fa-heart text-red-500 mr-1"></i> ${ep.likeNums || 0} Suka</span>
            </div>
            <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-red-600 border border-white/5 shadow-inner">
                <i class="fa-solid fa-play text-[10px] ml-0.5"></i>
            </div>`;
        epList.appendChild(btn);
    });
}

function playEp(idx) {
    if (idx < 0 || idx >= epData.length) return;
    curIdx = idx;
    const player = document.getElementById('mainPlayer');
    document.getElementById('playerContainer').classList.remove('hidden');
    
    document.querySelectorAll('[id^="ep-btn-"]').forEach(b => b.classList.remove('border-red-600', 'bg-red-600/5'));
    document.getElementById(`ep-btn-${idx}`)?.classList.add('border-red-600', 'bg-red-600/5');

    let ep = epData[idx];
    player.src = ep.playVoucher || ep.videoUrl;
    player.load(); player.play();

    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

// Inisialisasi Event Search
document.addEventListener('DOMContentLoaded', () => {
    changeTab('foryou');
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
});

