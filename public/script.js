const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

// Helper: Membongkar isi data secara otomatis dengan pengecekan lebih teliti
function extractData(json) {
    if (Array.isArray(json)) return json;
    // Cek hirarki data standar Netshort
    const data = json.data || json;
    if (Array.isArray(data)) return data;
    if (data.contentInfos && Array.isArray(data.contentInfos)) return data.contentInfos;
    if (data.rows && Array.isArray(data.rows)) return data.rows;
    if (data.list && Array.isArray(data.list)) return data.list;
    return [];
}

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error("API Error");
        const json = await res.json();
        return extractData(json);
    } catch (e) {
        console.error("Fetch Error:", e);
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
    label.innerText = `MEMUAT ${type.toUpperCase()}...`;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs animate-pulse text-red-500">SINKRONISASI DATA...</div>';

    // Penyesuaian Endpoint agar tidak Undefined
    let path = "";
    if (type === 'foryou') path = "/netshort/foryou";
    else if (type === 'theaters') path = "/netshort/theaters";
    else path = `/netshort/${type}`;

    const items = await apiGet(path);
    renderGrid(items);
    label.innerText = type.toUpperCase();
}

function renderGrid(items) {
    const container = document.getElementById('mainContainer');
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50 text-xs text-white">Data Tidak Ditemukan.</p>';
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        // Mapping ID
        const id = item.shortPlayId || item.bookId || item.id;
        
        // Mapping Judul
        const title = item.shortPlayName || item.bookName || item.title || item.name || "No Title";
        
        // Mapping Gambar (Cek semua kemungkinan key cover)
        const cover = item.coverWap || item.horizontalCover || item.verticalCover || item.cover || item.imgUrl;

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, item.shortPlayLabels || item.introduction || item.description);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 border border-white/5 shadow-lg group-active:scale-95 transition">
                <img src="${cover}" class="w-full h-full object-cover" 
                     onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 leading-tight uppercase">${title}</h3>`;
        container.appendChild(div);
    });
}

// ... Fungsi openDetail, playEp, dan closeModal tetap sama seperti sebelumnya ...

document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

