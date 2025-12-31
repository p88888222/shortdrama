/**
 * DRAMAXIN BOX - NETSHORT CORE JS
 * Optimized for: shortPlayId & shortPlayName
 */

// 1. BASE API
const API_BASE = "https://api.sansekai.my.id/api";

let epData = [];
let curIdx = -1;

// 2. API GET
async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) return [];
        const json = await res.json();
        
        // Menangani struktur Netshort yang sering berada di data.rows 
        // atau langsung di data.contentInfos untuk kategori tertentu
        let result = json.data?.rows || json.data?.contentInfos || json.data || json;
        return Array.isArray(result) ? result : [];
    } catch (e) { 
        console.error("Fetch Error:", e);
        return []; 
    }
}

// 3. NAVIGASI TAB
async function changeTab(type, el) {
    if (el) setActiveTab(el);
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    if (!container) return;

    label.innerText = `Memuat ${type.toUpperCase()}...`;
    container.innerHTML = '<div class="col-span-full text-center py-20 text-red-600 animate-pulse font-bold">SINKRONISASI DATABASE...</div>';
    
    // Endpoint sesuai permintaan
    let path = (type === 'foryou' || type === 'trending') ? '/netshort/foryou' : `/netshort/${type}`;

    const data = await apiGet(path);
    renderGrid(data);
    label.innerText = type.toUpperCase();
}

// 4. RENDER GRID (Disesuaikan dengan shortPlayId)
function renderGrid(items) {
    const container = document.getElementById('mainContainer');
    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50">Data tidak tersedia.</p>';
    
    items.forEach(item => {
        // Menggunakan Fallback Key berdasarkan contoh data baru Anda
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title || "Drama Tanpa Judul";
        const cover = item.horizontalCover || item.coverWap || item.cover;

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, item.introduction || item.shortPlayLabels || "");
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 mb-2 shadow-lg group-active:scale-95 transition">
                <img src="${cover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400'">
            </div>
            <h3 class="text-[10px] font-bold line-clamp-2 text-gray-300 px-1 leading-tight">${title}</h3>`;
        container.appendChild(div);
    });
}

// 5. PLAYER & DETAIL
async function openDetail(id, title, desc) {
    if (!id) return alert("ID Drama tidak ditemukan");
    
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    document.getElementById('playerContainer').classList.add('hidden');

    // Mengambil episode berdasarkan shortPlayId (bookId di API)
    epData = await apiGet(`/netshort/allepisode?bookId=${id}`);
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    
    if (epData.length === 0) {
        epList.innerHTML = "<p class='text-center py-10 opacity-50'>Episode tidak ditemukan.</p>";
    }

    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-white/5 p-4 rounded-2xl text-[10px] border border-white/5 flex justify-between items-center mb-1 active:bg-red-600/20";
        btn.innerHTML = `<span>EPISODE ${i + 1}</span><i class="fa-solid fa-play text-red-600"></i>`;
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
    // Prioritas URL video dari berbagai kemungkinan key API
    let url = ep.videoUrl || ep.url || ep.videoPath;

    if (ep.cdnList?.[0]?.videoPathList?.[0]) {
        url = (ep.cdnList.find(c => c.isDefault === 1) || ep.cdnList[0]).videoPathList[0].videoPath;
    }

    player.pause();
    player.src = url;
    player.load();
    player.play().catch(() => console.log("Menunggu interaksi user"));

    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
    
    player.onended = () => {
        if (curIdx + 1 < epData.length) playEp(curIdx + 1);
    };

    document.querySelector('#detailModal .overflow-y-auto').scrollTop = 0;
}

// 6. HELPER & INITIALIZE
function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    const player = document.getElementById('mainPlayer');
    player.pause();
    player.src = "";
    document.body.style.overflow = "auto";
}

function setActiveTab(el) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('tab-active', 'text-white');
        btn.classList.add('text-gray-500');
    });
    el.classList.add('tab-active', 'text-white');
    el.classList.remove('text-gray-500');
}

document.addEventListener('DOMContentLoaded', () => {
    // Load default tab
    changeTab('foryou');

    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value;
            if (query) {
                // Fungsi search bisa diarahkan ke endpoint netshort search jika tersedia
                apiGet(`/netshort/search?query=${encodeURIComponent(query)}`).then(renderGrid);
                document.getElementById('sectionLabel').innerText = `HASIL: ${query.toUpperCase()}`;
            }
        }
    });
});
