const BASE_URL = "https://api.sansekai.my.id/api/netshort";

// 1. Fungsi Utama Mengambil Data Drama
async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center animate-pulse text-sm">Menyiapkan Drama...</div>`;

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);
        const result = await response.json();
        
        // Cek apakah data ada di result.data atau langsung di result
        const items = result.data || result;

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten tidak ditemukan.</div>`;
            return;
        }

        renderVideos(items);
    } catch (error) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500 p-10 text-center">Gagal Memuat API.<br><small>${error.message}</small></div>`;
    }
}

// 2. Render Video ke Layar
function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map((item) => {
        // ID drama sangat penting untuk episode
        const playId = item.shortPlayId || item.id; 
        const cleanTitle = (item.title || "Drama").replace(/'/g, "\\'");
        
        return `
            <div class="snap-item w-full bg-black">
                <video 
                    class="w-full h-full object-cover" 
                    src="${item.url}" 
                    loop 
                    onclick="this.paused ? this.play() : this.pause()" 
                    playsinline
                ></video>
                
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-lg font-bold drop-shadow-lg">${item.title || 'Short Drama'}</h3>
                    
                    <button onclick="showEpisodes('${playId}', '${cleanTitle}')" 
                            class="pointer-events-auto mt-4 bg-red-600 text-white px-6 py-3 rounded-full text-xs font-bold shadow-xl active:scale-95 transition-transform">
                        📂 DAFTAR EPISODE
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 3. Fungsi Ambil Episode (DIPERBAIKI)
async function showEpisodes(shortPlayId, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    const drawerTitle = document.getElementById('drawer-title');

    if (!shortPlayId || shortPlayId === "undefined") {
        alert("Maaf, ID Drama (shortPlayId) tidak ditemukan pada data ini.");
        return;
    }

    // Tampilkan Drawer & Loading
    drawerTitle.innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full"></div></div>`;
    drawer.classList.remove('translate-y-full');

    try {
        // URL yang sesuai permintaan kamu
        const url = `${BASE_URL}/allepisode?shortPlayId=${shortPlayId}`;
        console.log("Meminta URL:", url);

        const res = await fetch(url);
        const result = await res.json();
        
        // Log data ke console untuk pengecekan manual
        console.log("Respon API Episode:", result);

        // Coba beberapa kemungkinan lokasi data di JSON
        const eps = result.data || result.episodes || (Array.isArray(result) ? result : []);

        if (!Array.isArray(eps) || eps.length === 0) {
            list.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-zinc-500 text-sm">Episode tidak ditemukan untuk ID: ${shortPlayId}</p>
                </div>`;
            return;
        }

        list.innerHTML = eps.map((ep, index) => `
            <div onclick="playNewVideo('${ep.url}')" class="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-2xl active:bg-red-600 cursor-pointer">
                <div class="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs">${index + 1}</div>
                <div class="flex-1">
                    <p class="text-sm font-bold truncate">${ep.title || `Episode ${index + 1}`}</p>
                    <p class="text-[10px] text-zinc-500 uppercase">Putar Video</p>
                </div>
            </div>
        `).join('');

    } catch (err) {
        list.innerHTML = `<div class="p-10 text-center text-red-500 text-xs">Gagal mengambil data: <br>${err.message}</div>`;
    }
}

function playNewVideo(url) {
    if (!url) return alert("URL Video tidak tersedia.");
    const mainVideo = document.querySelector('video');
    if (mainVideo) {
        mainVideo.src = url;
        mainVideo.play();
        closeDrawer();
        document.getElementById('content-list').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeDrawer() {
    document.getElementById('episode-drawer').classList.add('translate-y-full');
}

function changeTab(endpoint) {
    fetchData(endpoint);
}

// Jalankan saat start
window.onload = () => fetchData('theaters');
