const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error("API Error");
        return await res.json();
    } catch (e) {
        console.error("Fetch Error:", e);
        return null;
    }
}

async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active'));
        el.classList.add('tab-active');
    }
    
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs animate-pulse text-red-500">SINKRONISASI DATABASE...</div>';

    // Penyesuaian Endpoint
    let path = (type === 'foryou') ? '/netshort/foryou' : `/netshort/${type}`;
    const response = await apiGet(path);
    
    // Kirim data ke fungsi render
    renderGrid(response?.data || response, type);
}

function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');

    // --- LOGIKA PENENTUAN DAFTAR ITEM ---
    // Jika ada contentInfos (biasanya foryou), ambil itu. 
    // Jika dataObj sendiri adalah Array (biasanya theaters), gunakan langsung.
    // Jika ada dataObj.rows, gunakan itu.
    let items = [];
    if (dataObj?.contentInfos) {
        items = dataObj.contentInfos;
    } else if (Array.isArray(dataObj)) {
        items = dataObj;
    } else if (dataObj?.rows) {
        items = dataObj.rows;
    } else if (dataObj?.data && Array.isArray(dataObj.data)) {
        items = dataObj.data;
    }

    // Penentuan Judul Label
    const contentName = dataObj?.contentName || (type === 'theaters' ? 'Theaters' : 'Drama Terbaru');
    label.innerText = contentName.toUpperCase();

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50 text-xs text-white">Data Tidak Tersedia.</p>';
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title || item.name;
        
        // Gunakan logika cover yang sudah berhasil di For You
        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.horizontalCover || item.coverWap || item.cover;
        let finalCover = "";

        if (rawCover) {
            if (rawCover.startsWith('http')) {
                finalCover = rawCover;
            } else {
                const domain = "https://api.sansekai.my.id";
                finalCover = `${domain}${rawCover.startsWith('/') ? '' : '/'}${rawCover}`;
            }
        } else {
            finalCover = 'https://via.placeholder.com/300x400?text=No+Cover';
        }

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, item.shortPlayLabels || item.introduction || item.description);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 border border-white/5 shadow-lg group-active:scale-95 transition">
                <img src="${finalCover}" class="w-full h-full object-cover" 
                     onerror="this.src='https://via.placeholder.com/300x400?text=Error+Image'">
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 leading-tight uppercase">${title}</h3>`;
        container.appendChild(div);
    });
}

// Fungsi openDetail dan playEp tetap menggunakan logika yang lama karena sudah stabil
async function openDetail(id, title, desc) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    
    const epRaw = await apiGet(`/netshort/allepisode?bookId=${id}`);
    // Handle data episode jika dibungkus .data atau array langsung
    epData = epRaw?.data?.rows || epRaw?.data || epRaw || [];
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl text-[10px] border border-white/5 flex justify-between";
        btn.innerHTML = `<span>EPISODE ${i+1}</span> <i class="fa-solid fa-play text-red-600"></i>`;
        btn.onclick = () => playEp(i);
        epList.appendChild(btn);
    });
}

function playEp(idx) {
    if (idx < 0 || idx >= epData.length) return;
    curIdx = idx;
    const player = document.getElementById('mainPlayer');
    document.getElementById('playerContainer').classList.remove('hidden');
    let ep = epData[idx];
    player.src = ep.videoUrl || ep.url || ep.videoPath;
    player.play();
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

