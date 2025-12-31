const BASE_URL = "https://api.sansekai.my.id/api/netshort";

async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center animate-pulse text-sm font-bold">MENGHUBUNGKAN API...</div>`;
    
    try {
        // Memanggil lewat Proxy internal Railway untuk menghindari CORS
        const response = await fetch(`/api-proxy?path=/netshort/${endpoint}`);
        const result = await response.json();
        
        let items = [];

        // LOGIKA PENCARIAN DATA (DEEP SCAN)
        // 1. Cek apakah ini format Theaters (Data di dalam contentInfos)
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach(group => {
                if (group.contentInfos && Array.isArray(group.contentInfos)) {
                    items = [...items, ...group.contentInfos];
                }
            });
        }

        // 2. Jika langkah 1 gagal, cek format ForYou/Search (Data langsung di result atau data)
        if (items.length === 0) {
            items = result.data || result.contentInfos || (Array.isArray(result) ? result : []);
        }

        if (items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center text-zinc-500 italic text-xs">Konten tidak ditemukan atau sedang kosong.</div>`;
            return;
        }

        renderVideos(items);
    } catch (e) {
        console.error("Fetch Error:", e);
        container.innerHTML = `
            <div class="h-screen flex flex-col items-center justify-center text-center p-6">
                <span class="text-red-500 font-bold mb-2">⚠️ KONEKSI GAGAL</span>
                <p class="text-[10px] text-zinc-500 uppercase tracking-tighter">${e.message}</p>
                <button onclick="fetchData('${endpoint}')" class="mt-4 text-[10px] border border-zinc-700 px-6 py-2 rounded-full active:bg-zinc-800 uppercase font-bold">Coba Lagi</button>
            </div>`;
    }
}

function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map(item => {
        // Mengambil shortPlayId dan shortPlayName sesuai perintah
        const playId = item.shortPlayId;
        const name = (item.shortPlayName || item.title || "Drama").replace(/'/g, "\\'");
        
        // Memastikan URL video menggunakan playVoucher sesuai contoh JSON Anda
        const videoUrl = item.playVoucher || item.url || "";
        const poster = item.shortPlayCover || "";

        return `
            <div class="snap-item w-full relative group">
                <video class="w-full h-full object-cover" 
                       src="${videoUrl}" 
                       poster="${poster}"
                       loop 
                       playsinline 
                       webkit-playsinline
                       onclick="togglePlay(this)">
                </video>
                
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-lg font-bold text-white drop-shadow-lg font-sans">${item.shortPlayName || item.title || 'Drama'}</h3>
                    <p class="text-[10px] text-zinc-300 mt-1 line-clamp-2 drop-shadow-sm font-medium leading-relaxed">${item.shotIntroduce || item.description || ''}</p>
                    
                    <button onclick="showEpisodes('${playId}', '${name}')" 
                            class="pointer-events-auto mt-6 bg-red-600 text-white px-8 py-3 rounded-full text-[10px] font-black shadow-2xl active:scale-90 transition-all uppercase tracking-widest">
                        📂 Daftar Episode
                    </button>
                </div>
            </div>`;
    }).join('');
}

// Fungsi kontrol video agar lebih stabil di HP
function togglePlay(video) {
    if (video.paused) {
        video.play().catch(e => console.log("Play blocked"));
    } else {
        video.pause();
    }
}

async function showEpisodes(id, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    
    if (!id || id === "undefined") {
        alert("Gagal: Drama ini tidak memiliki shortPlayId yang valid.");
        return;
    }

    document.getElementById('drawer-title').innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20 animate-pulse text-xs font-bold text-red-500 uppercase">Mencari Episode...</div>`;
    drawer.classList.remove('translate-y-full');

    try {
        const res = await fetch(`/api-proxy?path=/netshort/allepisode&shortPlayId=${id}`);
        const result = await res.json();
        
        // Mengambil daftar episode dari shortPlayEpisodeInfos
        const eps = result.shortPlayEpisodeInfos || (result.data ? result.data.shortPlayEpisodeInfos : []);

        if (!eps || eps.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-zinc-500 text-[10px] italic">Maaf, daftar episode untuk drama ini sedang tidak tersedia.</p>`;
            return;
        }

        list.innerHTML = eps.map(ep => `
            <div onclick="playNewVideo('${ep.playVoucher}')" class="flex items-center gap-4 p-5 bg-zinc-800/40 border border-zinc-700/50 rounded-2xl active:bg-red-600 transition-all active:scale-95 mb-2">
                <div class="w-10 h-10 bg-zinc-700 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-inner">${ep.episodeNo}</div>
                <div class="flex-1">
                    <p class="text-xs font-bold text-white uppercase tracking-tight">Episode ${ep.episodeNo}</p>
                    <p class="text-[8px] text-zinc-500 uppercase mt-0.5">${ep.playClarity || 'Full HD'}</p>
                </div>
                <div class="text-[10px] text-zinc-400">▶️</div>
            </div>`).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center py-10 text-red-500 text-[10px] font-bold">GAGAL MEMUAT EPISODE</p>`;
    }
}

function playNewVideo(url) {
    const videos = document.querySelectorAll('video');
    if (videos.length > 0 && url) {
        // Mengganti source video pertama sebagai player utama
        const mainVideo = videos[0];
        mainVideo.src = url;
        mainVideo.load();
        mainVideo.play();
        closeDrawer();
        document.getElementById('content-list').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeDrawer() { document.getElementById('episode-drawer').classList.add('translate-y-full'); }
function changeTab(endpoint) { fetchData(endpoint); }

window.onload = () => fetchData('theaters');

