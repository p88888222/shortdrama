async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center animate-pulse">Memuat...</div>`;
    
    try {
        const response = await fetch(`/api-proxy?path=/netshort/${endpoint}`);
        const result = await response.json();
        
        let items = [];
        // PENANGANAN KHUSUS THEATERS (Berdasarkan JSON kamu)
        if (result.data && Array.isArray(result.data)) {
            if (result.data[0] && result.data[0].contentInfos) {
                items = result.data[0].contentInfos; // Masuk ke contentInfos
            } else {
                items = result.data;
            }
        } else {
            items = result.contentInfos || result;
        }

        renderVideos(items);
    } catch (e) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500 font-bold">API GAGAL</div>`;
    }
}

function renderVideos(items) {
    const container = document.getElementById('content-list');
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten Kosong</div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const playId = item.shortPlayId;
        const name = (item.shortPlayName || "Drama").replace(/'/g, "\\'");
        const videoUrl = item.playVoucher || item.url || "";
        const cover = item.shortPlayCover || "";

        return `
            <div class="snap-item w-full">
                <video class="w-full h-full object-cover" src="${videoUrl}" poster="${cover}" loop playsinline onclick="this.paused ? this.play() : this.pause()"></video>
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-lg font-bold drop-shadow-lg text-white">${item.shortPlayName || 'Drama'}</h3>
                    <button onclick="showEpisodes('${playId}', '${name}')" class="pointer-events-auto mt-4 bg-red-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg active:scale-95 transition">📂 DAFTAR EPISODE</button>
                </div>
            </div>`;
    }).join('');
}

async function showEpisodes(id, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    document.getElementById('drawer-title').innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20 animate-spin text-2xl">⏳</div>`;
    drawer.classList.remove('translate-y-full');

    try {
        const res = await fetch(`/api-proxy?path=/netshort/allepisode&shortPlayId=${id}`);
        const result = await res.json();
        const eps = result.shortPlayEpisodeInfos || (result.data ? result.data.shortPlayEpisodeInfos : []);
        
        if (!eps || eps.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-zinc-500">Episode Tidak Ditemukan (ID: ${id})</p>`;
            return;
        }

        list.innerHTML = eps.map(ep => `
            <div onclick="playNew('${ep.playVoucher}')" class="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl mb-2 active:bg-red-600">
                <div class="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs">${ep.episodeNo}</div>
                <div class="flex-1 font-bold text-sm">Episode ${ep.episodeNo}</div>
                <div class="text-xs">▶️</div>
            </div>`).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center py-10 text-red-500">Gagal Memuat.</p>`;
    }
}

function playNew(url) {
    const video = document.querySelector('video');
    if (video && url) { video.src = url; video.play(); closeDrawer(); }
}

function closeDrawer() { document.getElementById('episode-drawer').classList.add('translate-y-full'); }
function changeTab(endpoint) { fetchData(endpoint); }
window.onload = () => fetchData('theaters');

