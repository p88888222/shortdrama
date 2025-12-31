const BASE_URL = "https://api.sansekai.my.id/api/netshort";
let currentData = [];

// 1. Ambil data drama (Theaters/ForYou)
async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center">Memuat Drama...</div>`;

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);
        const result = await response.json();
        currentData = result.data || [];

        renderVideos(currentData);
    } catch (error) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500">Gagal memuat.</div>`;
    }
}

// 2. Render Video ke Layar
function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map((item) => `
        <div class="snap-item w-full bg-black">
            <video class="w-full h-full object-cover" src="${item.url}" loop onclick="this.paused ? this.play() : this.pause()" playsinline></video>
            
            <div class="absolute bottom-32 left-4 right-20">
                <h3 class="text-lg font-bold">${item.title}</h3>
                <p class="text-xs text-zinc-300 mb-4 line-clamp-1">${item.description || ''}</p>
                
                <button onclick="showEpisodes('${item.shortPlayId}', '${item.title}')" 
                        class="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold border border-white/30">
                    📂 Daftar Episode
                </button>
            </div>
        </div>
    `).join('');
}

// 3. Ambil dan Tampilkan Episode dari /netshort/allepisode
async function showEpisodes(id, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    const drawerTitle = document.getElementById('drawer-title');

    drawerTitle.innerText = title;
    list.innerHTML = `<p class="text-center py-10">Mencari episode...</p>`;
    drawer.classList.remove('translate-y-full'); // Munculkan drawer

    try {
        const res = await fetch(`${BASE_URL}/allepisode?shortPlayId=${id}`);
        const result = await res.json();
        const eps = result.data || [];

        list.innerHTML = eps.map((ep) => `
            <div onclick="playEpisode('${ep.url}')" class="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg active:bg-zinc-700">
                <div class="w-12 h-12 bg-zinc-700 rounded flex items-center justify-center text-xs font-bold">
                    EP ${ep.episodeNumber || '?' }
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold line-clamp-1">${ep.title || 'Episode Baru'}</p>
                </div>
                <span class="text-xs text-zinc-500">Putar</span>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center text-red-500">Gagal mengambil episode.</p>`;
    }
}

function playEpisode(url) {
    // Implementasi sederhana: ganti video yang sedang aktif atau buka window baru
    alert("Memutar episode baru...");
    // Untuk pengembangan: Kamu bisa buat video player utama berganti source-nya ke URL ini
    location.reload(); // Contoh simpel reset, idealnya ganti src video saja
}

function closeDrawer() {
    document.getElementById('episode-drawer').classList.add('translate-y-full');
}

window.onload = () => fetchData('theaters');
