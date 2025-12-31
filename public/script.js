const API_BASE = "https://api.sansekai.my.id/api";
let epData = [];
let curIdx = -1;

// Fungsi Pintar untuk mencari Array di dalam Object API
function findDataArray(obj) {
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== 'object' || obj === null) return [];
    
    // Cari di dalam property yang sering digunakan (contentInfos, rows, data)
    if (obj.contentInfos && Array.isArray(obj.contentInfos)) return obj.contentInfos;
    if (obj.rows && Array.isArray(obj.rows)) return obj.rows;
    if (obj.data) return findDataArray(obj.data);
    
    // Jika tidak ketemu, cari property apapun yang berisi Array
    for (let key in obj) {
        if (Array.isArray(obj[key])) return obj[key];
    }
    return [];
}

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        const json = await res.json();
        return findDataArray(json);
    } catch (e) {
        console.error("Gagal memuat API:", e);
        return [];
    }
}

async function changeTab(type, el) {
    const container = document.getElementById('mainContainer');
    container.innerHTML = '<div class="col-span-full text-center py-20 text-red-600 animate-pulse">Menghubungkan ke Server...</div>';
    
    const path = (type === 'foryou') ? '/netshort/foryou' : `/netshort/${type}`;
    const data = await apiGet(path);
    renderGrid(data);
}

function renderGrid(items) {
    const container = document.getElementById('mainContainer');
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50">Data tidak tersedia. Cek Console (F12).</p>';
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        // Menggunakan field sesuai contoh Anda: shortPlayId & shortPlayName
        const id = item.shortPlayId || item.id;
        const title = item.shortPlayName || item.title || "No Title";
        const cover = item.horizontalCover || item.coverWap || item.cover;

        const div = document.createElement('div');
        div.className = "cursor-pointer group";
        div.onclick = () => openDetail(id, title, item.shortPlayLabels || "");
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-2">
                <img src="${cover}" class="w-full h-full object-cover">
            </div>
            <h3 class="text-[10px] font-bold line-clamp-2 text-gray-300">${title}</h3>`;
        container.appendChild(div);
    });
}

// ... (Sisanya fungsi openDetail dan playEp tetap sama)
document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));
