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
 * 3. RENDER GRID DENGAN JUMLAH EPISODE
 */
async function renderGrid(dataObj, type) {
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

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 opacity-50 text-xs text-white">Konten Tidak Ditemukan</p>';
        return;
    }

    container.innerHTML = "";
    
    // Gunakan for...of agar bisa menggunakan await di dalam loop jika ingin fetch jumlah episode real-time
    // Namun untuk efisiensi, kita tampilkan placeholder atau label "Full" jika data jumlah episode tidak ada di objek utama
    items.forEach(item => {
        const id = item.shortPlayId || item.bookId || item.id;
        const title = item.shortPlayName || item.bookName || item.title;
        
        // Deskripsi menggunakan shortIntroduce sesuai permintaan
        const desc = item.shortIntroduce || item.shortPlayLabels || item.introduction || "";

        // Penanganan Gambar
        let rawCover = item.shortPlayCover || item.groupShortPlayCover || item.horizontalCover || item.coverWap || item.cover;
        let finalCover = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover.startsWith('/') ? '' : '/'}${rawCover}`) : 'https://via.placeholder.com/300x400?text=No+Cover';

        const div = document.createElement('div');
        div.className = "cursor-pointer animate-slideUp group relative";
        div.onclick = () => openDetail(id, title, desc);
        div.innerHTML = `
            <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 border border-white/5 shadow-lg group-active:scale-95 transition relative">
                <img src="${finalCover}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x400?text=Error'">
                <div class="absolute bottom-2 right-2 bg-red-600 text-[8px] font-bold px-2 py-1 rounded-md shadow-lg text-white">
                    EP ${item.episodeNum || item.totalEpisode || '??'}
                </div>
            </div>
            <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 leading-tight uppercase">${title}</h3>`;
        container.appendChild(div);
    });
}

/**
 * 4. DETAIL & PLAYER (DENGAN ENDPOINT EPISODE BARU)
 */
async function openDetail(id, title, desc) {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = desc || "Deskripsi tidak tersedia.";
    
    // Menggunakan endpoint /allepisode dengan parameter shortPlayId
    const res = await apiGet(`/netshort/allepisode?shortPlayId=${id}`);
    
    // Menyesuaikan dengan struktur response: shortPlayEpisodeInfos
    epData = res?.shortPlayEpisodeInfos || res?.data || res || [];
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";

    if (epData.length === 0) {
        epList.innerHTML = "<p class='text-center text-xs opacity-50 py-10'>Episode tidak ditemukan.</p>";
    }

    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-white/5 p-4 rounded-xl text-[10px] border border-white/5 flex justify-between items-center mb-1 active:bg-red-600/20";
        btn.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-gray-500 font-mono">${String(i + 1).padStart(2, '0')}</span>
                <span>EPISODE ${ep.episodeNo || i + 1}</span>
            </div>
            <i class="fa-solid fa-play text-red-600 text-[8px]"></i>`;
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
    
    // Mapping URL video dari response baru (biasanya di playVoucher atau videoPath)
    player.src = ep.playVoucher || ep.videoUrl || ep.url;
    player.load();
    player.play();

    document.getElementById('prevBtn').onclick = () => playEp(curIdx - 1);
    document.getElementById('nextBtn').onclick = () => playEp(curIdx + 1);
    player.onended = () => { if (curIdx + 1 < epData.length) playEp(curIdx + 1); };
}

