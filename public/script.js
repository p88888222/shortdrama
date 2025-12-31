// Menggunakan proxy lokal dari server.js agar aman dari CORS
const API_BASE = "/api-proxy";

let epData = [];
let curIdx = -1;

// Helper: Membongkar isi data secara otomatis
function extractData(json) {
    if (Array.isArray(json)) return json;
    const data = json.data || json;
    if (Array.isArray(data)) return data;
    if (data.contentInfos && Array.isArray(data.contentInfos)) return data.contentInfos;
    if (data.rows && Array.isArray(data.rows)) return data.rows;
    return [];
}

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error("API Error");
        const json = await res.json();
        return extractData(json);
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active'));
        el.classList.add('tab-active');
    }
    
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    label.innerText = `MEMUAT ${type}...`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs animate-pulse">SINKRONISASI DATA...</div>';

    const path = (type === 'foryou') ? '/netshort/foryou' : `/netshort/${type}`;
    const items = await apiGet(path);
    
    container.innerHTML = items.length ? "" : '<p class="col-span-full text-center py-20 opacity-50 text-xs">Data Kosong.</p>';
    
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title;
        const cover = item.horizontalCover || item.coverWap || item.cover;

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp";
        div.onclick = () => openDetail(id, title, item.shortPlayLabels || item.introduction);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1">
                <img src="${cover}" class="w-full h-full object-cover shadow-2xl">
            </div>
            <h3 class="text-[9px] font-bold line-clamp-1 text-gray-400 px-1 uppercase">${title}</h3>`;
        container.appendChild(div);
    });
    label.innerText = type;
}

async function openDetail(id, title, desc) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Tidak ada deskripsi.";
    
    epData = await apiGet(`/netshort/allepisode?bookId=${id}`);
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
    const container = document.getElementById('playerContainer');
    container.classList.remove('hidden');

    let ep = epData[idx];
    player.src = ep.videoUrl || ep.url || ep.videoPath;
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

document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

