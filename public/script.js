const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

/**
 * 1. API GET UNIVERSAL
 */
async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error("API Error");
        const json = await res.json();
        
        // Mengambil objek data utama (biasanya json.data)
        return json.data || json; 
    } catch (e) {
        console.error("Fetch Error:", e);
        return null;
    }
}

/**
 * 2. NAVIGASI TAB
 */
async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('tab-active');
            b.classList.add('text-gray-500');
        });
        el.classList.add('tab-active');
        el.classList.remove('text-gray-500');
    }
    
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    
    label.innerText = `MEMUAT ${type.toUpperCase()}...`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs animate-pulse text-red-600 font-bold uppercase">Menghubungkan Database...</div>';

    // Endpoint tujuan
    let path = (type === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    
    const response = await apiGet(path);
    
    // Kirim response ke fungsi render
    renderGrid(response, type);
}

/**
 * 3. RENDER GRID (Identik untuk For You & Theaters)
 */
function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');

    // MENGAMBIL JUDUL: Prioritas contentName dari API
    // Jika API memberikan data dalam array (Theaters seringkali begitu), 
    // kita cek apakah item pertama punya contentName atau gunakan fallback.
    const labelName = dataObj?.contentName || (Array.isArray(dataObj) ? dataObj[0]?.contentName : null) || type.toUpperCase();
    label.innerText = labelName;

    // MENGAMBIL DAFTAR ITEM: Mencari Array secara agresif di contentInfos atau data utama
    let items = [];
    if (dataObj?.contentInfos && Array.isArray(dataObj.contentInfos)) {
        items = dataObj.contentInfos;
    } else if (Array.isArray(dataObj)) {
        // Jika dataObj adalah array yang berisi objek dengan contentInfos (struktur list of groups)
        if (dataObj[0]?.contentInfos) {
            items = dataObj.flatMap(group => group.contentInfos || []);
        } else {
            items = dataObj;
        }
    } else if (dataObj?.data && Array.isArray(dataObj.data)) {
        items = dataObj.data;
    }

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50 text-xs text-white">Konten Tidak Ditemukan</p>';
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title || item.name;
        
        // Logika Cover (Prioritas shortPlayCover sesuai temuan Anda)
        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.horizontalCover || item.coverWap || item.cover;
        let finalCover = "";

        if (rawCover) {
            if (rawCover.startsWith('http')) {
                finalCover = rawCover;
            } else {
                finalCover = `https://api.sansekai.my.id${rawCover.startsWith('/') ? '' : '/'}${rawCover}`;
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
                     onerror="this.src='https://via.placeholder.com/300x400?text=Error+Loading'">
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 leading-tight uppercase">${title}</h3>`;
        container.appendChild(div);
    });
}

// Fungsi openDetail, playEp, dan closeModal tetap sama...

/**
 * 4. PLAYER & EPISODE LOGIC (Tetap)
 */
async function openDetail(id, title, desc) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    
    // Pastikan pengambilan episode juga universal
    const res = await apiGet(`/netshort/allepisode?bookId=${id}`);
    epData = res?.rows || res?.data || (Array.isArray(res) ? res : []);
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl text-[10px] border border-white/5 flex justify-between items-center mb-1 active:bg-red-600/20";
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
    
    // Prioritas URL video
    player.src = ep.videoUrl || ep.url || ep.videoPath;
    player.load();
    player.play();

    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
    player.onended = () => playEp(curIdx + 1);
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

// Inisialisasi Pertama
document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

