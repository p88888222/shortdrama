const BASE_URL = "https://api.sansekai.my.id/api/netshort";

// 1. Ambil List Drama (Theaters/ForYou)
async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    container.innerHTML = `<div class="h-screen flex items-center justify-center animate-pulse text-sm">Menyiapkan Drama...</div>`;

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);
        const result = await response.json();
        
        // Sesuaikan jika response dibungkus data atau tidak
        const items = result.data || result;

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center">Konten tidak tersedia.</div>`;
            return;
        }

        renderVideos(items);
    } catch (error) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500">Error: ${error.message}</div>`;
    }
}

// 2. Tampilkan Video di Feed Utama
function renderVideos(items) {
    const container = document.getElementById('content-list');
    container.innerHTML = items.map((item) => {
        const playId = item.shortPlayId;
        const title = (item.shortPlayName || item.title || "Drama").replace(/'/g, "\\'");
        
        // Gunakan playVoucher jika url tidak ada
        const videoUrl = item.playVoucher || item.url || "";

        return `
            <div class="snap-item w-full bg-black">
                <video 
                    class="w-full h-full object-cover" 
                    src="${videoUrl}" 
                    loop 
                    onclick="this.paused ? this.play() : this.pause()" 
                    playsinline
                ></video>
                
                <div class="absolute bottom-32 left-4 right-20 pointer-events-none">
                    <h3 class="text-lg font-bold drop-shadow-xl text-white">${item.shortPlayName || item.title}</h3>
                    <p class="text-xs text-zinc-300 mt-1 line-clamp-2 drop-shadow-md">${item.shotIntroduce || item.description || ''}</p>
                    
                    <button onclick="showEpisodes('${playId}', '${title}')" 
                            class="pointer-events-auto mt-5 bg-red-600 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl active:scale-95 transition-all">
                        📂 DAFTAR EPISODE
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 3. Ambil Episode (Berdasarkan contoh JSON kamu)
async function showEpisodes(shortPlayId, title) {
    const drawer = document.getElementById('episode-drawer');
    const list = document.getElementById('episode-list');
    const drawerTitle = document.getElementById('drawer-title');

    drawerTitle.innerText = title;
    list.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full"></div></div>`;
    drawer.classList.remove('translate-y-full');

    try {
        const res = await fetch(`${BASE_URL}/allepisode?shortPlayId=${shortPlayId}`);
        const result = await res.json();
        
        // BERDASARKAN JSON KAMU: Data ada di 'shortPlayEpisodeInfos'
        const eps = result.shortPlayEpisodeInfos || result.data || [];

        if (eps.length === 0) {
            list.innerHTML = `<p class="text-center py-10 text-zinc-500 text-sm">Episode tidak ditemukan.</p>`;
            return;
        }

        list.innerHTML = eps.map((ep) => `
            <div onclick="playNewVideo('${ep.playVoucher}')" class="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-2xl active:bg-red-600 cursor-pointer mb-2 transition-colors">
                <div class="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs">
                    ${ep.episodeNo}
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold truncate">Episode ${ep.episodeNo}</p>
                    <p class="text-[10px] text-zinc-400 uppercase tracking-tighter">Kualitas: ${ep.playClarity || 'HD'}</p>
                </div>
                <div class="text-xs text-zinc-500">▶️</div>
            </div>
        `).join('');

    } catch (err) {
        list.innerHTML = `<p class="text-center py-10 text-red-500 text-xs">Error: ${err.message}</p>`;
    }
}

function playNewVideo(url) {
    if (!url) return alert("Link video tidak tersedia.");
    const mainVideo = document.querySelector('video');
    if (mainVideo) {
        mainVideo.src = url;
        mainVideo.play();
        closeDrawer();
        // Scroll ke video yang sedang aktif
        document.getElementById('content-list').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeDrawer() {
    document.getElementById('episode-drawer').classList.add('translate-y-full');
}

function changeTab(endpoint) {
    fetchData(endpoint);
}

window.onload = () => fetchData('theaters');
