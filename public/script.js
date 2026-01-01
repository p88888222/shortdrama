const API_BASE = "/api-proxy";
let epData = [];
let curIdx = -1;

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        const json = await res.json();
        return json.data || json;
    } catch (e) { return null; }
}

async function changeTab(type, el) {
    if (el) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('tab-active'));
        el.classList.add('tab-active');
    }
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    container.innerHTML = '<div class="col-span-full py-20 text-center text-xs animate-pulse">SINKRONISASI DATA...</div>';

    let path = (type === 'foryou') ? '/netshort/foryou' : '/netshort/theaters';
    const data = await apiGet(path);
    renderGrid(data, type);
}

function renderGrid(dataObj, type) {
    const container = document.getElementById('mainContainer');
    const label = document.getElementById('sectionLabel');
    
    label.innerText = dataObj?.contentName || type.toUpperCase();
    let items = dataObj?.contentInfos || (Array.isArray(dataObj) ? dataObj : []);
    
    container.innerHTML = "";
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title;
        const totalEp = item.totalEpisode || item.episodeNum || "??";
        const desc = item.shortIntroduce || item.shortPlayLabels || "";

        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.coverWap || item.cover;
        let finalCover = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover.startsWith('/') ? '' : '/'}${rawCover}`) : 'https://via.placeholder.com/300x400';

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp";
        div.onclick = () => openDetail(id, title, desc, totalEp);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 mb-2 relative border border-white/5">
                <img src="${finalCover}" class="w-full h-full object-cover">
                <div class="absolute bottom-2 right-2 bg-red-600 text-[8px] font-bold px-2 py-1 rounded text-white shadow-lg">
                    ${totalEp} EP
                </div>
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 uppercase">${title}</h3>`;
        container.appendChild(div);
    });
}

async function openDetail(id, title, desc, totalEp) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Tidak ada deskripsi.";
    document.getElementById('modalTotalEp').innerText = `${totalEp} TOTAL EPISODE`;
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = '<div class="py-10 text-center text-xs animate-pulse">MEMUAT EPISODE...</div>';

    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    epData = res?.shortPlayEpisodeInfos || res?.data || [];
    
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "w-full text-left bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col gap-2 hover:bg-white/10 transition";
        btn.onclick = () => playEp(i);
        btn.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-sm">EPISODE ${ep.episodeNo || i+1}</span>
                <i class="fa-solid fa-play text-red-600"></i>
            </div>
            <div class="flex gap-4 text-[8px] font-bold text-gray-500 uppercase">
                <span><i class="fa-solid fa-heart text-red-500"></i> ${ep.likeNums || 0} Suka</span>
                <span><i class="fa-solid fa-star text-yellow-500"></i> ${ep.chaseNums || 0} Chase</span>
            </div>`;
        epList.appendChild(btn);
    });
    if (epData.length > 0) playEp(0);
}

function playEp(idx) {
    if (idx < 0 || idx >= epData.length) return;
    curIdx = idx;
    const player = document.getElementById('mainPlayer');
    document.getElementById('playerContainer').classList.remove('hidden');
    
    document.querySelectorAll('[id^="ep-btn-"]').forEach(b => b.classList.remove('border-red-600', 'bg-red-600/5'));
    document.getElementById(`ep-btn-${idx}`)?.classList.add('border-red-600', 'bg-red-600/5');

    let ep = epData[idx];
    player.src = ep.playVoucher || ep.videoUrl;
    player.load();
    player.play();

    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('mainPlayer').pause();
    document.body.style.overflow = "auto";
}

document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

