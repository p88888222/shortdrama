/**
 * DRAMAXIN BOX - ULTIMATE CORE JS
 * Sync: Auto-Next, Bot Parameter, Tab Navigation
 */

const API_BASE = window.location.hostname.includes('vercel.app') 
    ? "/api-proxy/dramabox" 
    : "https://api.sansekai.my.id/api/dramabox";

let epData = [];
let curIdx = -1;

// 1. API GET
async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) return [];
        const json = await res.json();
        let result = path.includes('/vip') 
            ? (json.columnVoList?.flatMap(c => c.bookList || []) || []) 
            : (json.data?.data || json.data || json);
        return Array.isArray(result) ? result : [];
    } catch (e) { return []; }
}

// 2. NAVIGASI TAB
async function changeTab(type, el) {
    if (el) setActiveTab(el);
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    if (!container) return;

    label.innerText = `Memuat ${type.toUpperCase()}...`;
    container.innerHTML = '<div class="col-span-full text-center py-20 text-red-600 animate-pulse font-bold">SINKRONISASI DATABASE...</div>';
    
    const path = type === 'dubindo' ? '/dubindo?classify=terbaru&page=1' : `/${type}`;
    const data = await apiGet(path);
    renderGrid(data);
    label.innerText = type.toUpperCase();
}

// 3. PENCARIAN (SERVER-SIDE)
async function performSearch(query) {
    if (!query) return;
    const container = document.getElementById('mainContainer');
    container.innerHTML = '<div class="col-span-full text-center py-20 text-red-500 font-bold italic animate-bounce">Mencari...</div>';
    const results = await apiGet(`/search?query=${encodeURIComponent(query)}`);
    renderGrid(results);
    document.getElementById('sectionLabel').innerText = `HASIL: ${query.toUpperCase()}`;
}

// 4. RENDER GRID
function renderGrid(items) {
    const container = document.getElementById('mainContainer');
    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50">Data tidak tersedia.</p>';
    items.forEach(item => {
        const id = item.bookId || item.id;
        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, item.bookName || item.title, item.introduction);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 mb-2 shadow-lg group-active:scale-95 transition">
                <img src="${item.coverWap || item.cover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400'">
            </div>
            <h3 class="text-[10px] font-bold line-clamp-2 text-gray-300 px-1 leading-tight">${item.bookName || item.title}</h3>`;
        container.appendChild(div);
    });
}

// 5. PLAYER & AUTO-NEXT LOGIC
async function openDetail(id, title, desc) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    document.getElementById('playerContainer').classList.add('hidden');

    epData = await apiGet(`/allepisode?bookId=${id}`);
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
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
    let url = ep.videoUrl || ep.url;
    if (ep.cdnList?.[0]?.videoPathList?.[0]) {
        url = (ep.cdnList.find(c => c.isDefault === 1) || ep.cdnList[0]).videoPathList[0].videoPath;
    }

    player.pause();
    player.src = url;
    player.load();
    player.play().catch(() => console.log("Menunggu interaksi user"));

    // Navigasi & Auto Next
    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
    
    // Logika Auto-Next Terintegrasi
    player.onended = () => {
        if (curIdx + 1 < epData.length) {
            playEp(curIdx + 1);
        }
    };

    document.querySelector('#detailModal .overflow-y-auto').scrollTop = 0;
}

// 6. HELPER FUNCTIONS
function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    const player = document.getElementById('mainPlayer');
    player.pause();
    player.src = "";
    document.body.style.overflow = "auto";
}

function setActiveTab(el) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('text-gray-500');
    });
    el.classList.add('tab-active');
    el.classList.remove('text-gray-500');
}

// 7. INITIALIZE (DOM READY)
document.addEventListener('DOMContentLoaded', () => {
    const p = new URLSearchParams(window.location.search);
    const bid = p.get('bookId');
    const q = p.get('query');

    if (bid) {
        changeTab('trending').then(() => openDetail(bid, "Memuat...", ""));
    } else if (q) {
        performSearch(q);
    } else {
        changeTab('trending');
    }

    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(e.target.value);
    });
});
