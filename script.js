const BASE_URL = "https://api.sansekai.my.id/api/netshort";

// 1. Fungsi Mengambil Data Drama
async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center animate-pulse text-sm">Menyiapkan Drama...</div>`;

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);
        const result = await response.json();
        const items = result.data || [];

        if (items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten tidak tersedia.</div>`;
            return;
        }

        renderVideos(items);
    } catch (error) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500">Gagal Memuat API.</div>`;
    }
}

// 2. Render Video ke Layar (Mobile-first)
function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map((item) => {
        // Membersihkan karakter aneh pada judul agar tidak merusak fungsi onclick
        const cleanTitle = item.title.replace(/'/g, "\\'");
        
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
                    <h3 class="text-lg font-bold drop-shadow-lg">${item.title}</h3>
                    <p class="text-xs text-zinc-300 mb-4 line-clamp-2 drop-shadow-md">${item.description || ''}</p>
                    
                    <button onclick="showEpisodes('${item.shortPlayId}', '${cleanTitle}')" 
                            class="pointer-events-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl transition active:scale-95">
                        <span>📂</span> LIHAT EPISODE
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 3. Fungsi Ambil Episode Berdasarkan shortPlayId
async function showEpisodes(shortPlayId, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    const drawerTitle = document.getElementById('drawer-title');

    if (!shortPlayId) return alert("ID Drama tidak ditemukan.");

    // Setup Drawer
    drawerTitle.innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full"></div></div>`;
    drawer.classList.remove('translate-y-full');

    try {
        const res = await fetch(`${BASE_URL}/allepisode?shortPlayId=${shortPlayId}`);
        const result = await res.json();
        
        // Sesuaikan dengan respon API: result.data adalah array episode
        const eps = result.data || [];

        if (eps.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-zinc-500">Episode belum tersedia.</p>`;
            return;
        }

        list.innerHTML = eps.map((ep, index) => `
            <div onclick="playNewVideo('${ep.url}')" class="flex items-center gap-4 p-4 bg-zinc-800/40 border border-zinc-700/50 rounded-2xl active:bg-red-600 transition group cursor-pointer">
                <div class="w-10 h-10 bg-zinc-700 group-active:bg-white/20 rounded-lg flex items-center justify-center font-bold text-xs">
                    ${index + 1}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold truncate">${ep.title || `Episode ${index + 1}`}</p>
                    <p class="text-[10px] text-zinc-500 group-active:text-white/70 tracking-tighter uppercase">Putar Video</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center py-10 text-red-500">Gagal mengambil daftar episode.</p>`;
    }
}

// 4. Putar Video Baru di Player Utama
function playNewVideo(url) {
    const mainVideo = document.querySelector('video');
    if (mainVideo && url) {
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

// Start
window.onload = () => fetchData('theaters');
