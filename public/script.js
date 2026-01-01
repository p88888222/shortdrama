const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

/**
 * 1. API GET dengan Timeout
 */
async function apiGet(path) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000); // Timeout 8 detik

    try {
        const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) return null;
        const json = await res.json();
        return json.data || json;
    } catch (e) {
        console.error("Fetch Error:", e);
        return null;
    }
}

/**
 * 2. Navigasi Tab
 */
async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active', 'text-red-500'));
        el.classList.add('tab-active', 'text-red-500');
    }
    
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    label.innerText = `MEMUAT ${type.toUpperCase()}...`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs text-red-600 animate-pulse">SINKRONISASI...</div>';

    const path = (type === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderGrid(data, type);
}

/**
 * 3. Render Grid (Perbaikan Mapping Deskripsi & Episode)
 */
function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    
    // Set Label
    label.innerText = dataObj?.contentName || type.toUpperCase();

    // Pastikan data adalah Array
    let items = [];
    if (dataObj?.contentInfos) {
        items = dataObj.contentInfos;
    } else if (Array.isArray(dataObj)) {
        // Jika dataObj adalah array grup (Theaters), gabungkan isinya
        items = dataObj[0]?.contentInfos ? dataObj.flatMap(g => g.contentInfos || []) : dataObj;
    }

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50 text-xs">Data Tidak Ditemukan</p>';
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        const id = item.shortPlayId || item.id;
        const title = item.shortPlayName || item.title || "No Title";
        
        // MAPPING FIX: totalEpisode & shotIntroduce
        const totalEp = item.totalEpisode || item.episodeNum || "??";
        const desc = (item.shotIntroduce || item.shortIntroduce || "Deskripsi tidak tersedia").replace(/"/g, '&quot;');
        const tags = Array.isArray(item.shortPlayLabels) ? item.shortPlayLabels.join(" • ") : "";

        const rawCover = item.shortPlayCover || item.groupShortPlayCover || item.cover;
        const finalCover = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover.startsWith('/') ? '' : '/'}${rawCover}`) : '';

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp";
        // Gunakan pendekatan yang lebih aman untuk passing string panjang
        div.onclick = () => openDetail(id, title, desc, totalEp, tags);
        
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
                <img src="${finalCover}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">
                    ${totalEp} EP
                </div>
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 uppercase leading-tight">${title}</h3>`;
        container.appendChild(div);
    });
}

/**
 * 4. Detail Modal & Search Logic (Tetap sama namun lebih ringan)
 */
async function openDetail(id, title, desc, totalEp, tags) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc;
    document.getElementById('modalTotalEp').innerText = `${totalEp} TOTAL EPISODE`;
    
    const labelContainer = document.getElementById('modalLabels');
    labelContainer.innerHTML = tags ? tags.split(' • ').map(t => `<span class="bg-red-600/10 text-red-500 px-2 py-0.5 rounded border border-red-500/10">${t}</span>`).join('') : '';
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<p class="text-center py-5 text-xs text-red-600 animate-pulse">Memuat Episode...</p>';

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || [];
    
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl flex items-center justify-between text-xs border border-white/5 mb-1";
        btn.onclick = () => {
            const player = document.getElementById('mainPlayer');
            player.src = ep.playVoucher || ep.videoUrl;
            player.play();
        };
        btn.innerHTML = `<span>EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-600 opacity-50 text-[10px]"></i>`;
        epList.appendChild(btn);
    });
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    changeTab('foryou');
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value;
                if(!query) return;
                document.getElementById('sectionLabel').innerText = `HASIL: ${query.toUpperCase()}`;
                const data = await apiGet(`/netshort/search?query=${encodeURIComponent(query)}`);
                renderGrid(data, 'search');
            }
        });
    }
});

