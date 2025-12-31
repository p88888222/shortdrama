async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center">Memuat Drama...</div>`;
    
    try {
        // Untuk Search, kita gunakan endpoint search dengan parameter kosong di awal
        const apiPath = endpoint === 'search' ? '/netshort/search' : `/netshort/${endpoint}`;
        const response = await fetch(`/api-proxy?path=${apiPath}`);
        const result = await response.json();
        
        let items = [];
        
        // Perbaikan: Logika pembacaan data bertingkat untuk tab Theaters
        if (result.data && Array.isArray(result.data)) {
            // Cek apakah data pertama punya properti contentInfos (struktur tab Theaters)
            if (result.data[0] && result.data[0].contentInfos) {
                items = result.data.flatMap(group => group.contentInfos || []);
            } else {
                items = result.data;
            }
        } else {
            items = result.contentInfos || result || [];
        }

        renderVideos(items);
    } catch (e) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500">Gagal Memuat API</div>`;
    }
}

function renderVideos(items) {
    const container = document.getElementById('content-list');
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten Tidak Ditemukan</div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const playId = item.shortPlayId;
        const name = (item.shortPlayName || "Drama").replace(/'/g, "\\'");
        // Pastikan URL video ada
        const videoUrl = item.playVoucher || item.url || "";

        return `
            <div class="snap-item w-full bg-black relative">
                <video class="w-full h-full object-cover" 
                       src="${videoUrl}" 
                       loop 
                       playsinline 
                       webkit-playsinline
                       onclick="togglePlay(this)">
                </video>
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-lg font-bold text-white drop-shadow-md">${item.shortPlayName || 'Drama'}</h3>
                    <button onclick="showEpisodes('${playId}', '${name}')" 
                            class="pointer-events-auto mt-4 bg-red-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg active:scale-95">
                        📂 DAFTAR EPISODE
                    </button>
                </div>
            </div>`;
    }).join('');
}

// Fungsi kontrol video agar lebih stabil
function togglePlay(video) {
    if (video.paused) {
        video.play().catch(e => console.log("Autoplay blocked"));
    } else {
        video.pause();
    }
}

async function showEpisodes(id, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    
    document.getElementById('drawer-title').innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20 text-red-500 animate-pulse">MEMUAT...</div>`;
    drawer.classList.remove('translate-y-full');

    try {
        const res = await fetch(`/api-proxy?path=/netshort/allepisode&shortPlayId=${id}`);
        const result = await res.json();
        
        // Mengambil dari shortPlayEpisodeInfos sesuai JSON Anda
        const eps = result.shortPlayEpisodeInfos || (result.data ? result.data.shortPlayEpisodeInfos : []);

        if (!eps || eps.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-zinc-500 text-xs">Episode belum tersedia.</p>`;
            return;
        }

        list.innerHTML = eps.map(ep => `
            <div onclick="playNewVideo('${ep.playVoucher}')" class="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl mb-2 active:bg-red-600 transition">
                <div class="w-8 h-8 bg-zinc-700 rounded flex items-center justify-center font-bold text-xs">${ep.episodeNo}</div>
                <div class="flex-1 text-sm">Episode ${ep.episodeNo}</div>
                <div class="text-[10px]">▶️</div>
            </div>`).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center py-10 text-red-500">Error.</p>`;
    }
}

function playNewVideo(url) {
    const video = document.querySelector('video');
    if (video && url) {
        video.src = url;
        video.load(); // Paksa reload source video
        video.play();
        closeDrawer();
    }
}

function closeDrawer() { document.getElementById('episode-drawer').classList.add('translate-y-full'); }
function changeTab(endpoint) { fetchData(endpoint); }

window.onload = () => fetchData('theaters');

