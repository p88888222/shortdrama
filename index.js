const PROXY = "https://api.allorigins.win/raw?url=";
const BASE_API = "https://api.sansekai.my.id/api";

const videoPlayer = videojs('player', { 
    controls: true, 
    autoplay: false,
    fluid: true 
});

async function loadTab(tabName) {
    const container = document.getElementById('content');
    
    // Update Tab UI
    document.getElementById('tab-foryou').className = tabName === 'foryou' ? 'tab-active pb-1' : 'text-zinc-500 pb-1';
    document.getElementById('tab-theaters').className = tabName === 'theaters' ? 'tab-active pb-1' : 'text-zinc-500 pb-1';
    
    container.innerHTML = '<div class="text-center py-20 text-zinc-500 text-sm">Memuat drama...</div>';

    try {
        const endpoint = tabName === 'foryou' ? '/netshort/foryou' : '/netshort/theaters';
        const finalUrl = PROXY + encodeURIComponent(BASE_API + endpoint);
        
        const response = await fetch(finalUrl);
        const result = await response.json();

        // LOGIKA KHUSUS UNTUK STRUKTUR contentInfos
        let dramaList = [];
        
        // Memeriksa struktur respon JSON Anda
        if (result.data) {
            if (Array.isArray(result.data) && result.data[0]?.contentInfos) {
                dramaList = result.data[0].contentInfos;
            } else if (result.data.contentInfos) {
                dramaList = result.data.contentInfos;
            } else if (Array.isArray(result.data)) {
                dramaList = result.data;
            }
        }

        if (dramaList.length === 0) {
            container.innerHTML = '<div class="text-center py-20 text-zinc-700 text-xs italic">Drama tidak ditemukan. Cek respon API.</div>';
            return;
        }

        container.innerHTML = "";
        dramaList.forEach(item => {
            // Mapping ID dan Nama tepat dari respon JSON Anda
            const id = item.shortPlayId;
            const name = item.shortPlayName;
            const cover = item.coverUrl || "https://via.placeholder.com/150x200?text=No+Cover";

            const card = document.createElement('div');
            card.className = "drama-card flex gap-4 p-3 cursor-pointer mb-3 hover:bg-zinc-800 transition";
            card.innerHTML = `
                <img src="${cover}" class="w-20 h-28 object-cover rounded-lg bg-zinc-800 shadow-md">
                <div class="flex flex-col justify-center overflow-hidden">
                    <h3 class="text-sm font-bold text-white truncate pr-4">${name}</h3>
                    <div class="flex flex-wrap gap-1 mt-2">
                        ${item.labelArray ? item.labelArray.slice(0, 2).map(l => `<span class="text-[9px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-medium">${l}</span>`).join('') : ''}
                    </div>
                    <p class="text-[10px] text-orange-500 mt-4 font-bold uppercase tracking-widest">MULAI NONTON →</p>
                </div>
            `;
            
            // Saat drama diklik, panggil endpoint allEpisode
            card.onclick = () => loadAllEpisodes(id);
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<div class="text-red-500 text-center py-20 text-xs font-mono">Gagal Memuat Data.<br>${err.message}</div>`;
    }
}

async function loadAllEpisodes(shortPlayId) {
    const container = document.getElementById('content');
    container.innerHTML = '<div class="text-center py-20 text-zinc-500 text-sm">Mengambil daftar episode...</div>';

    try {
        const epUrl = `${BASE_API}/netshort/allEpisode?shortPlayId=${shortPlayId}`;
        const response = await fetch(PROXY + encodeURIComponent(epUrl));
        const result = await response.json();
        const data = result.data; // shortPlayName & episodes[]

        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <button onclick="loadTab('foryou')" class="text-[10px] bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full font-bold">← KEMBALI</button>
                <h2 class="text-[10px] font-bold text-orange-500 truncate uppercase w-40 text-right">${data.shortPlayName}</h2>
            </div>
            <div class="space-y-2">
                ${data.episodes.map(ep => `
                    <div onclick="playVideo('${ep.video_url}')" class="p-4 bg-zinc-900 rounded-xl flex justify-between items-center border border-zinc-800 hover:border-orange-500 transition">
                        <span class="text-sm font-medium">Episode ${ep.episode_number}</span>
                        <span class="text-orange-500 text-xs font-bold">PLAY</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        if (data.episodes && data.episodes.length > 0) {
            playVideo(data.episodes[0].video_url);
        }
    } catch (err) {
        container.innerHTML = '<div class="text-red-500 text-center py-20 text-xs italic">Gagal memuat daftar episode.</div>';
    }
}

function playVideo(url) {
    if (!url) return alert("Video tidak tersedia.");
    const type = url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
    videoPlayer.src({ src: url, type: type });
    videoPlayer.play();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Inisialisasi awal aplikasi
document.addEventListener('DOMContentLoaded', () => loadTab('foryou'));

