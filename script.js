const BASE_URL = "https://api.sansekai.my.id/api/netshort";

async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center">Menyiapkan Drama...</div>`;

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);
        const result = await response.json();
        const items = result.data || result;

        if (!items || items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten Kosong.</div>`;
            return;
        }

        renderVideos(items);
    } catch (e) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500">Gagal Memuat API</div>`;
    }
}

function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map(item => {
        const playId = item.shortPlayId;
        const title = (item.shortPlayName || "NetShort Drama").replace(/'/g, "\\'");
        const videoUrl = item.playVoucher || item.url || "";

        return `
            <div class="snap-item w-full">
                <video class="w-full h-full object-cover" src="${videoUrl}" loop playsinline onclick="this.paused ? this.play() : this.pause()"></video>
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-xl font-bold drop-shadow-lg">${item.shortPlayName || 'Short Drama'}</h3>
                    <p class="text-xs text-zinc-300 mt-2 line-clamp-2">${item.shotIntroduce || ''}</p>
                    <button onclick="showEpisodes('${playId}', '${title}')" 
                            class="pointer-events-auto mt-6 bg-red-600 text-white px-8 py-3 rounded-full text-xs font-bold shadow-xl active:scale-95 transition">
                        📂 DAFTAR EPISODE
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function showEpisodes(id, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    
    document.getElementById('drawer-title').innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20 animate-spin text-2xl">⏳</div>`;
    drawer.classList.remove('translate-y-full');

    try {
        const res = await fetch(`${BASE_URL}/allepisode?shortPlayId=${id}`);
        const result = await res.json();
        
        // Mengambil data dari shortPlayEpisodeInfos sesuai JSON API
        const eps = result.shortPlayEpisodeInfos || result.data || [];

        if (eps.length === 0) {
            list.innerHTML = `<p class="text-center py-20 text-zinc-500">Daftar episode tidak ditemukan.</p>`;
            return;
        }

        list.innerHTML = eps.map(ep => `
            <div onclick="playNew('${ep.playVoucher}')" class="flex items-center gap-4 p-4 bg-zinc-800 rounded-2xl active:bg-red-600 transition cursor-pointer">
                <div class="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs">${ep.episodeNo}</div>
                <div class="flex-1">
                    <p class="text-sm font-bold">Episode ${ep.episodeNo}</p>
                    <p class="text-[10px] text-zinc-400 uppercase tracking-tighter">${ep.playClarity || 'HD'}</p>
                </div>
                <div class="text-xs">▶️</div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center py-20 text-red-500">Error mengambil episode.</p>`;
    }
}

function playNew(url) {
    const video = document.querySelector('video');
    if (video && url) {
        video.src = url;
        video.play();
        closeDrawer();
        document.getElementById('content-list').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeDrawer() { document.getElementById('episode-drawer').classList.add('translate-y-full'); }
function changeTab(endpoint) { fetchData(endpoint); }

window.onload = () => fetchData('theaters');

