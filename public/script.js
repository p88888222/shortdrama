/**
 * DRAMAXIN BOX - SMART MAPPING JS
 * Menangani otomatis berbagai struktur API Netshort
 */

const API_BASE = "https://api.sansekai.my.id/api";
let epData = [];
let curIdx = -1;

// 1. API GET DENGAN AUTO-FLATTEN
async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) return [];
        const json = await res.json();
        
        let rawData = json.data || json;
        let finalItems = [];

        // OTOMATIS: Jika data dibungkus contentInfos, kita "bongkar" keluar
        if (rawData.contentInfos && Array.isArray(rawData.contentInfos)) {
            finalItems = rawData.contentInfos;
        } 
        // OTOMATIS: Jika data dibungkus rows
        else if (rawData.rows && Array.isArray(rawData.rows)) {
            finalItems = rawData.rows;
        }
        // OTOMATIS: Jika data sudah berupa array
        else if (Array.isArray(rawData)) {
            finalItems = rawData;
        }

        return finalItems;
    } catch (e) { 
        console.error("Fetch Error:", e);
        return []; 
    }
}

// 2. NAVIGASI TAB
async function changeTab(type, el) {
    if (el) setActiveTab(el);
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    
    label.innerText = `Memuat ${type.toUpperCase()}...`;
    container.innerHTML = '<div class="col-span-full text-center py-20 text-red-600 animate-pulse font-bold">SINKRONISASI DATABASE...</div>';
    
    let path = (type === 'foryou') ? '/netshort/foryou' : `/netshort/${type}`;
    const data = await apiGet(path);
    renderGrid(data);
    label.innerText = type.toUpperCase();
}

// 3. RENDER GRID (Fokus pada shortPlayId & shortPlayName)
function renderGrid(items) {
    const container = document.getElementById('mainContainer');
    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50">Data tidak tersedia.</p>';
    
    items.forEach(item => {
        // Langsung menggunakan key yang Anda minta
        const id = item.shortPlayId || item.id;
        const title = item.shortPlayName || item.title || "No Title";
        const cover = item.horizontalCover || item.cover;

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, item.shortPlayLabels || "");
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 mb-2 shadow-lg group-active:scale-95 transition">
                <img src="${cover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400'">
            </div>
            <h3 class="text-[10px] font-bold line-clamp-2 text-gray-300 px-1 leading-tight">${title}</h3>`;
        container.appendChild(div);
    });
}

// 4. DETAIL & EPISODE
async function openDetail(id, title, desc) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc;

    // Mengambil episode (bookId di API biasanya tetap menggunakan shortPlayId)
    epData = await apiGet(`/netshort/allepisode?bookId=${id}`);
    
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

// 5. PLAYER LOGIC (Tetap Sama)
function playEp(idx) {
    if (idx < 0 || idx >= epData.length) return;
    curIdx = idx;
    const player = document.getElementById('mainPlayer');
    document.getElementById('playerContainer').classList.remove('hidden');
    
    let ep = epData[idx];
    let url = ep.videoUrl || ep.url || ep.videoPath;

    player.src = url;
    player.play();

    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
    player.onended = () => { if (curIdx + 1 < epData.length) playEp(curIdx + 1); };
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

function setActiveTab(el) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.replace('text-white', 'text-gray-500'));
    el.classList.replace('text-gray-500', 'text-white');
}

document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

