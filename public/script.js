const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

// ... (apiGet dan changeTab tetap sama) ...

/**
 * RENDER GRID (Main Page)
 */
function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');

    const labelName = dataObj?.contentName || (Array.isArray(dataObj) ? dataObj[0]?.contentName : null) || type.toUpperCase();
    label.innerText = labelName;

    let items = [];
    if (dataObj?.contentInfos && Array.isArray(dataObj.contentInfos)) {
        items = dataObj.contentInfos;
    } else if (Array.isArray(dataObj)) {
        items = dataObj[0]?.contentInfos ? dataObj.flatMap(group => group.contentInfos || []) : dataObj;
    }

    container.innerHTML = "";
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title;
        const desc = item.shortIntroduce || item.shortPlayLabels || item.introduction || "";
        const totalEp = item.totalEpisode || item.episodeNum || "??";

        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.horizontalCover || item.coverWap || item.cover;
        let finalCover = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover.startsWith('/') ? '' : '/'}${rawCover}`) : 'https://via.placeholder.com/300x400?text=No+Cover';

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group";
        div.onclick = () => openDetail(id, title, desc, totalEp);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 mb-2 border border-white/5 shadow-xl relative">
                <img src="${finalCover}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                <div class="absolute bottom-2 right-2 bg-red-600 text-[8px] font-black px-2 py-1 rounded-md text-white shadow-lg">
                    ${totalEp} EP
                </div>
            </div>
            <h3 class="text-[10px] font-bold line-clamp-2 text-gray-300 px-1 leading-tight uppercase tracking-tighter">${title}</h3>`;
        container.appendChild(div);
    });
}

/**
 * OPEN DETAIL (Modal View)
 */
async function openDetail(id, title, desc, totalEp) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    // Reset Player
    document.getElementById('playerContainer').classList.add('hidden');
    const player = document.getElementById('mainPlayer');
    player.pause();
    player.src = "";

    // Set Metadata
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Tidak ada deskripsi untuk drama ini.";
    document.getElementById('modalTotalEp').innerText = `${totalEp} TOTAL EPISODE`;
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<div class="py-10 text-center text-xs animate-pulse text-red-500">MEMUAT EPISODE...</div>';

    // Fetch Episode
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || res?.data || res || [];
    
    epList.innerHTML = "";
    if (epData.length === 0) {
        epList.innerHTML = "<p class='text-center text-xs opacity-50 py-10 text-white'>Episode tidak ditemukan.</p>";
        return;
    }

    // Render Episode Buttons (Tampilan lebih besar & nyaman)
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col gap-3 hover:bg-white/10 active:scale-[0.98] transition-all";
        btn.onclick = () => playEp(i);
        btn.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <span class="text-2xl font-black text-white/20">#${String(i + 1).padStart(2, '0')}</span>
                    <span class="font-bold text-sm text-gray-100">EPISODE ${ep.episodeNo || i + 1}</span>
                </div>
                <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs shadow-lg shadow-red-600/20">
                    <i class="fa-solid fa-play ml-0.5"></i>
                </div>
            </div>
            <div class="flex gap-5 text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-heart text-red-500"></i> ${ep.likeNums || '0'} Suka</span>
                <span class="flex items-center gap-1.5"><i class="fa-solid fa-fire text-orange-500"></i> ${ep.chaseNums || '0'} Hot</span>
            </div>
        `;
        epList.appendChild(btn);
    });

    // Auto-play episode 1 jika ada
    if (epData.length > 0) playEp(0);
}

function playEp(idx) {
    if (idx < 0 || idx >= epData.length) return;
    curIdx = idx;
    
    const player = document.getElementById('mainPlayer');
    const container = document.getElementById('playerContainer');
    container.classList.remove('hidden');

    // Highlight active episode
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

    // Setup Nav
    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
    player.onended = () => playEp(curIdx + 1);
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    const player = document.getElementById('mainPlayer');
    player.pause();
    player.src = "";
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

