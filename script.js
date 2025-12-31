const BASE_URL = "https://api.sansekai.my.id/api/netshort";

async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center">Memuat Drama...</div>`;

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);
        const result = await response.json();
        
        // Cek apakah data ada di result.data atau langsung di result
        const items = result.data || result;

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten kosong.</div>`;
            return;
        }

        renderVideos(items);
    } catch (error) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500">API Error</div>`;
    }
}

function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map((item) => {
        // DETEKSI ID: Gunakan shortPlayId jika ada, jika tidak gunakan id biasa
        const playId = item.shortPlayId || item.id;
        
        // DETEKSI JUDUL: Gunakan shortPlayName atau title
        const rawTitle = item.shortPlayName || item.title || "Drama Tanpa Judul";
        const cleanTitle = rawTitle.replace(/'/g, "\\'");
        
        // DETEKSI VIDEO: playVoucher atau url
        const videoUrl = item.playVoucher || item.url || "";

        return `
            <div class="snap-item w-full bg-black">
                <video class="w-full h-full object-cover" src="${videoUrl}" loop onclick="this.paused ? this.play() : this.pause()" playsinline></video>
                
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-lg font-bold text-white drop-shadow-md">${rawTitle}</h3>
                    <p class="text-[10px] text-zinc-300 mt-1 line-clamp-2">${item.shotIntroduce || item.description || ''}</p>
                    
                    <button onclick="showEpisodes('${playId}', '${cleanTitle}')" 
                            class="pointer-events-auto mt-5 bg-red-600 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl active:scale-95">
                        📂 DAFTAR EPISODE
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function showEpisodes(shortPlayId, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    const drawerTitle = document.getElementById('drawer-title');

    // Cek apakah shortPlayId benar-benar ada
    if (!shortPlayId || shortPlayId === "undefined") {
        console.error("ID tidak ditemukan untuk judul:", title);
        alert("Gagal: ID Drama tidak ditemukan di API drama ini.");
        return;
    }

    drawerTitle.innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full"></div></div>`;
    drawer.classList.remove('translate-y-full');

    try {
        const url = `${BASE_URL}/allepisode?shortPlayId=${shortPlayId}`;
        console.log("Memanggil Endpoint Episode:", url);

        const res = await fetch(url);
        const result = await res.json();
        
        // LOGIC PENENTU: Ambil data dari shortPlayEpisodeInfos sesuai JSON yang kamu beri
        let eps = [];
        if (result.shortPlayEpisodeInfos) {
            eps = result.shortPlayEpisodeInfos;
        } else if (result.data && result.data.shortPlayEpisodeInfos) {
            eps = result.data.shortPlayEpisodeInfos;
        } else if (Array.isArray(result.data)) {
            eps = result.data;
        }

        if (eps.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-zinc-500">ID ${shortPlayId}: Episode tidak ditemukan.</p>`;
            return;
        }

        list.innerHTML = eps.map((ep) => `
            <div onclick="playNewVideo('${ep.playVoucher}')" class="flex items-center gap-4 p-4 bg-zinc-800/60 rounded-2xl active:bg-red-600 mb-2">
                <div class="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs">
                    ${ep.episodeNo || '?'}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold text-white">Episode ${ep.episodeNo}</p>
                    <p class="text-[10px] text-zinc-400 uppercase font-mono">${ep.playClarity || 'HD'}</p>
                </div>
                <div class="text-xs">▶️</div>
            </div>
        `).join('');

    } catch (err) {
        list.innerHTML = `<p class="text-center py-10 text-red-500">Koneksi Error.</p>`;
    }
}

function playNewVideo(url) {
    if (!url) return alert("Video tidak tersedia.");
    const mainVideo = document.querySelector('video');
    if (mainVideo) {
        mainVideo.src = url;
        mainVideo.play();
        closeDrawer();
        document.getElementById('content-list').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeDrawer() { document.getElementById('episode-drawer').classList.add('translate-y-full'); }
function changeTab(endpoint) { fetchData(endpoint); }

window.onload = () => fetchData('theaters');
