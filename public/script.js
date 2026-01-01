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
        // Mengambil data utama (biasanya di json.data)
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

    let path = (type === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const response = await apiGet(path);
    renderGrid(response, type);
}

/**
 * 3. RENDER GRID (Fixed Theaters & Total Episode)
 */
function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');

    // Mencegah Undefined pada Label (Theaters seringkali memiliki struktur berbeda)
    const labelName = dataObj?.contentName || (Array.isArray(dataObj) ? dataObj[0]?.contentName : null) || type.toUpperCase();
    label.innerText = labelName;

    // Deteksi Array Data secara cerdas
    let items = [];
    if (dataObj?.contentInfos && Array.isArray(dataObj.contentInfos)) {
        items = dataObj.contentInfos;
    } else if (Array.isArray(dataObj)) {
        // Jika dataObj adalah list grup (Theaters), ambil semua contentInfos dari tiap grup
        if (dataObj[0]?.contentInfos) {
            items = dataObj.flatMap(group => group.contentInfos || []);
        } else {
            items = dataObj;
        }
    }

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50 text-xs text-white uppercase tracking-widest">Data Tidak Ditemukan</p>';
        return;
    }

    container.innerHTML = "";
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title;
        
        // Deskripsi: Prioritas shortIntroduce
        const desc = item.shortIntroduce || item.shortPlayLabels || item.introduction || "";

        // Indikator Episode: Menggunakan totalEpisode
        const totalEp = item.totalEpisode || item.episodeNum || "??";

        // Logika Cover (Prioritas shortPlayCover)
        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.horizontalCover || item.coverWap || item.cover;
        let finalCover = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover.startsWith('/') ? '' : '/'}${rawCover}`) : 'https://via.placeholder.com/300x400';

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, desc, totalEp);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 mb-1 border border-white/5 shadow-lg group-active:scale-95 transition relative">
                <img src="${finalCover}" class="w-full h-full object-cover">
                <div class="absolute bottom-2 right-2 bg-red-600 text-[8px] font-black px-2 py-1 rounded-md text-white shadow-lg">
                    ${totalEp} EP
                </div>
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 leading-tight uppercase tracking-tighter">${title}</h3>`;
        container.appendChild(div);
    });
}

/**
 * 4. OPEN DETAIL (No Auto-play on Open)
 */
async function openDetail(id, title, desc, totalEp) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    // Reset Metadata & Player
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    document.getElementById('modalTotalEp').innerText = `${totalEp} TOTAL EPISODE`;
    
    document.getElementById('playerContainer').classList.add('hidden');
    const player = document.getElementById('mainPlayer');
    player.pause();
    player.src = "";

    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<div class="py-10 text-center text-xs animate-pulse text-red-500">MEMUAT EPISODE...</div>';

    // Fetch Data Episode
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || res?.data || [];
    
    epList.innerHTML = "";
    if (epData.length === 0) {
        epList.innerHTML = "<p class='text-center text-xs opacity-50 py-10'>Episode tidak ditemukan.</p>";
        return;
    }

    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col gap-2 mb-1 active:bg-red-600/20 transition";
        // User klik episode = play
        btn.onclick = () => playEp(i); 
        btn.innerHTML = `
            <div class="flex justify-between items-center w-full">
                <span class="font-bold text-gray-200 text-sm">EPISODE ${ep.episodeNo || i + 1}</span>
                <i class="fa-solid fa-play text-red-600 text-[10px]"></i>
            </div>
            <div class="flex gap-4 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                <span><i class="fa-solid fa-heart text-red-500"></i> ${ep.likeNums || '0'} Suka</span>
                <span><i class="fa-solid fa-star text-yellow-500"></i> ${ep.chaseNums || '0'} Chase</span>
            </div>
        `;
        epList.appendChild(btn);
    });
}

/**
 * 5. PLAYER LOGIC (Auto-next support)
 */
function playEp(idx) {
    if (idx < 0 || idx >= epData.length) return;
    curIdx = idx;
    
    const player = document.getElementById('mainPlayer');
    const container = document.getElementById('playerContainer');
    container.classList.remove('hidden');

    // Highlight button aktif
    document.querySelectorAll('[id^="ep-btn-"]').forEach(btn => btn.classList.remove('border-red-600', 'bg-red-600/5'));
    const activeBtn = document.getElementById(`ep-btn-${idx}`);
    if (activeBtn) {
        activeBtn.classList.add('border-red-600', 'bg-red-600/5');
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let ep = epData[idx];
    player.src = ep.playVoucher || ep.videoUrl || ep.url;
    player.load();
    player.play();

    // Navigasi
    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
    
    // Auto-next ke episode berikutnya
    player.onended = () => {
        if (curIdx + 1 < epData.length) playEp(curIdx + 1);
    };
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

