// Konfigurasi Endpoint sesuai perintah
const BASE_API = "https://api.sansekai.my.id/api";
const ENDPOINTS = {
    theaters: `${BASE_API}/netshort/theaters`,
    foryou: `${BASE_API}/netshort/foryou`,
    search: `${BASE_API}/netshort/search`,
    episode: `${BASE_API}/netshort/allepisode` // Menggunakan ?shortPlayId=
};

// 1. Fungsi Mengambil Data Drama dari Tab (Theaters/ForYou/Search)
async function fetchData(tabName) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center animate-pulse">Menghubungkan ke ${tabName}...</div>`;
    
    const url = ENDPOINTS[tabName];

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        const items = result.data || result; // Menangani jika data dibungkus atau tidak

        if (!items || items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten ${tabName} tidak ditemukan.</div>`;
            return;
        }

        renderVideos(items);
    } catch (e) {
        console.error("Gagal Fetch:", e);
        container.innerHTML = `
            <div class="h-screen flex flex-col items-center justify-center text-center p-6">
                <span class="text-red-500 mb-2">⚠️ Koneksi API Gagal</span>
                <p class="text-xs text-zinc-500">${e.message}</p>
                <button onclick="fetchData('${tabName}')" class="mt-4 text-xs bg-zinc-800 px-4 py-2 rounded-full">Coba Lagi</button>
            </div>`;
    }
}

// 2. Render Video ke Layar Utama
function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map(item => {
        // Mengambil shortPlayId sesuai perintah untuk link episode
        const playId = item.shortPlayId; 
        const name = (item.shortPlayName || item.title || "Drama").replace(/'/g, "\\'");
        const videoUrl = item.playVoucher || item.url || "";

        return `
            <div class="snap-item w-full">
                <video class="w-full h-full object-cover" src="${videoUrl}" loop playsinline onclick="this.paused ? this.play() : this.pause()"></video>
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-lg font-bold drop-shadow-md text-white">${item.shortPlayName || item.title || 'Judul Drama'}</h3>
                    <p class="text-[10px] text-zinc-300 mt-1 line-clamp-2">${item.shotIntroduce || item.description || ''}</p>
                    
                    <button onclick="showEpisodes('${playId}', '${name}')" 
                            class="pointer-events-auto mt-5 bg-red-600 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl active:scale-95 transition-all">
                        📂 DAFTAR EPISODE
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 3. Mengambil Data Episode Berdasarkan shortPlayId
async function showEpisodes(id, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    
    if (!id || id === "undefined") {
        alert("Gagal: Drama ini tidak memiliki shortPlayId");
        return;
    }

    document.getElementById('drawer-title').innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20 animate-spin text-2xl">⏳</div>`;
    drawer.classList.remove('translate-y-full');

    try {
        // Memanggil allepisode dengan query parameter shortPlayId
        const res = await fetch(`${ENDPOINTS.episode}?shortPlayId=${id}`);
        const result = await res.json();
        
        // Sesuai contoh JSON: Data ada di shortPlayEpisodeInfos
        const eps = result.shortPlayEpisodeInfos || result.data || [];

        if (eps.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-zinc-500">Episode tidak ditemukan untuk ID: ${id}</p>`;
            return;
        }

        list.innerHTML = eps.map(ep => `
            <div onclick="playNew('${ep.playVoucher}')" class="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl active:bg-red-600 transition cursor-pointer mb-2">
                <div class="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs">${ep.episodeNo}</div>
                <div class="flex-1 font-bold text-sm text-white">Episode ${ep.episodeNo}</div>
                <div class="text-xs">▶️</div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center py-10 text-red-500 text-xs font-mono">Gagal memuat episode: ${err.message}</p>`;
    }
}

// Fungsi bantu navigasi & player
function playNew(url) {
    const video = document.querySelector('video');
    if (video && url) { video.src = url; video.play(); closeDrawer(); }
}

function closeDrawer() { document.getElementById('episode-drawer').classList.add('translate-y-full'); }

function changeTab(tabName) {
    // Scroll container ke atas sebelum ganti tab
    document.getElementById('content-list').scrollTo({ top: 0 });
    fetchData(tabName);
}

// Load default tab
window.onload = () => fetchData('theaters');

