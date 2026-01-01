const API_BASE = "/api-proxy";
let epData = [];

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json.data || json;
    } catch (e) {
        console.error("Fetch Error:", e);
        return null;
    }
}

// FITUR PENCARIAN (Query Fix)
async function performSearch(query) {
    if (!query) return;
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    label.innerText = `HASIL: ${query.toUpperCase()}`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs text-red-600 animate-pulse">MENCARI...</div>';
    
    // Memanggil endpoint search sesuai permintaan
    const data = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
    renderGrid(data, 'search');
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

    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50 text-xs text-white">Drama tidak ditemukan</p>';
    
    items.forEach(item => {
        // Ambil ID secara fleksibel
        const id = item.shortPlayId || item.id || item.bookId;
        const title = item.shortPlayName || item.bookName || item.title;
        
        // PENGAMBILAN TOTAL EPISODE SECARA DINAMIS
        const totalEp = item.totalEpisode || item.episodeNum || item.shortPlayEpisodeNum || "0";
        const desc = item.shotIntroduce || item.shortIntroduce || "";
        const tags = item.shortPlayLabels || [];

        const rawCover = item.shortPlayCover || item.groupShortPlayCover || item.cover;
        const finalCover = rawCover?.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover?.startsWith('/') ? '' : '/'}${rawCover}`;

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp";
        div.onclick = () => openDetail(id, title, desc, totalEp, tags);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
                <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">
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
    
    // RESET VIDEO (Agar tidak memutar drama sebelumnya)
    player.pause();
    player.src = "";
    player.load();

    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    document.getElementById('modalTotalEp').innerText = `${totalEp} TOTAL EPISODE`;
    
    const labelContainer = document.getElementById('modalLabels');
    labelContainer.innerHTML = Array.isArray(tags) ? tags.map(t => `<span class="bg-red-600/10 text-red-500 px-2 py-0.5 rounded border border-red-500/10">${t}</span>`).join('') : '';
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<p class="text-center py-5 text-xs text-red-600 animate-pulse">Memuat Episode...</p>';

    // Fetch Episode berdasarkan shortPlayId
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    const eps = res?.shortPlayEpisodeInfos || [];
    
    epList.innerHTML = "";
    eps.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex items-center justify-between text-xs border border-white/5 mb-1";
        btn.onclick = () => {
            player.src = ep.playVoucher || ep.videoUrl || ep.url;
            player.play();
        };
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 opacity-50"></i>`;
        epList.appendChild(btn);
    });
}

function closeModal() {
    const player = document.getElementById('mainPlayer');
    document.getElementById('detailModal').classList.add('hidden');
    player.pause();
    player.src = ""; // Clear source saat ditutup
    document.body.style.overflow = "auto";
}

// Listener Search Input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
    changeTab('foryou');
});

