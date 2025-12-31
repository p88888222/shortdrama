const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error("API Error");
        return await res.json(); // Mengembalikan full object (bukan hanya array)
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

    let path = (type === 'foryou') ? '/netshort/foryou' : `/netshort/${type}`;
    const response = await apiGet(path);
    
    // Kirim full response.data ke fungsi render
    renderGrid(response?.data || response);
}

function renderGrid(dataObj) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');

    // 1. Ambil Nama Konten (Misal: "Drama Viral")
    const contentName = dataObj?.contentName || "DRAMA TERBARU";
    label.innerText = contentName.toUpperCase();

    // 2. Ambil Daftar Drama dari contentInfos
    const items = dataObj?.contentInfos || (Array.isArray(dataObj) ? dataObj : []);

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50 text-xs text-white">Data Tidak Tersedia.</p>';
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title;
        
        // --- LOGIKA PERBAIKAN COVER (Prioritas shortPlayCover & groupShortPlayCover) ---
        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.horizontalCover || item.coverWap || item.cover;
        let finalCover = "";

        if (rawCover) {
            // Jika URL berupa path relatif (misal: /images/xxx.jpg), tambahkan domain API
            if (rawCover.startsWith('http')) {
                finalCover = rawCover;
            } else {
                // Pastikan domain ini sesuai dengan base API Anda
                const domain = "https://api.sansekai.my.id";
                finalCover = `${domain}${rawCover.startsWith('/') ? '' : '/'}${rawCover}`;
            }
        } else {
            // Gambar cadangan jika semua field kosong
            finalCover = 'https://via.placeholder.com/300x400?text=No+Cover';
        }
        // -----------------------------------------------------------------------------

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, item.shortPlayLabels || item.introduction);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 border border-white/5 shadow-lg group-active:scale-95 transition">
                <img src="${finalCover}" class="w-full h-full object-cover" 
                     onerror="this.src='https://via.placeholder.com/300x400?text=Error+Image'">
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 leading-tight uppercase">${title}</h3>`;
        container.appendChild(div);
    });
}


// Fungsi openDetail dan playEp tetap sama seperti sebelumnya...
async function openDetail(id, title, desc) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    
    // Untuk allepisode, biasanya langsung berupa array
    const epRaw = await apiGet(`/netshort/allepisode?bookId=${id}`);
    epData = epRaw?.data || epRaw || [];
    
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

