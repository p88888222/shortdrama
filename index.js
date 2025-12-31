const BASE_URL = "https://api.sansekai.my.id/api";
const player = videojs('main-player', { controls: true, autoplay: false });

// Fungsi ganti Tab
async function changeTab(tabName) {
    const container = document.getElementById('content-area');
    document.getElementById('tab-foryou').className = tabName === 'foryou' ? 'tab-active' : 'text-zinc-500';
    document.getElementById('tab-theaters').className = tabName === 'theaters' ? 'tab-active' : 'text-zinc-500';
    
    container.innerHTML = '<p class="text-center py-10 text-zinc-600">Loading...</p>';

    try {
        const endpoint = tabName === 'foryou' ? '/netshort/foryou' : '/netshort/theaters';
        const res = await fetch(`${BASE_URL}${endpoint}`);
        const result = await res.json();

        // Ambil data dari contentInfos sesuai contoh respons Anda
        let dramaList = [];
        if (result.data && result.data.contentInfos) {
            dramaList = result.data.contentInfos;
        } else if (Array.isArray(result.data)) {
            dramaList = result.data[0]?.contentInfos || result.data;
        }

        container.innerHTML = "";
        dramaList.forEach(drama => {
            const card = document.createElement('div');
            card.className = "flex gap-4 p-2 bg-zinc-900 rounded-xl cursor-pointer hover:bg-zinc-800 transition";
            card.innerHTML = `
                <img src="${drama.coverUrl || 'https://via.placeholder.com/100x140'}" class="w-20 h-28 object-cover rounded-lg">
                <div class="flex flex-col justify-center overflow-hidden">
                    <h3 class="font-bold text-sm truncate">${drama.shortPlayName}</h3>
                    <div class="flex flex-wrap gap-1 mt-2">
                        ${drama.labelArray ? drama.labelArray.slice(0,2).map(l => `<span class="bg-zinc-800 text-[10px] px-2 py-0.5 rounded text-zinc-400">${l}</span>`).join('') : ''}
                    </div>
                </div>
            `;
            card.onclick = () => loadEpisodes(drama.shortPlayId);
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-red-500 text-center py-10">Gagal memuat API.</p>';
    }
}

// Fungsi load Episode
async function loadEpisodes(shortPlayId) {
    const container = document.getElementById('content-area');
    container.innerHTML = '<p class="text-center py-10 text-zinc-600">Mengambil episode...</p>';

    try {
        const res = await fetch(`${BASE_URL}/netshort/allEpisode?shortPlayId=${shortPlayId}`);
        const result = await res.json();
        const data = result.data;

        container.innerHTML = `
            <div class="flex items-center gap-2 mb-4">
                <button onclick="changeTab('foryou')" class="text-zinc-400">← Back</button>
                <h2 class="text-orange-500 font-bold text-xs uppercase truncate">${data.shortPlayName}</h2>
            </div>
            <div class="space-y-2">
                ${data.episodes.map(ep => `
                    <div onclick="playVideo('${ep.video_url}')" class="p-4 bg-zinc-900 rounded-lg flex justify-between items-center cursor-pointer border border-transparent hover:border-orange-500">
                        <span class="text-sm">Episode ${ep.episode_number}</span>
                        <span class="text-orange-500">▶</span>
                    </div>
                `).join('')}
            </div>
        `;

        if(data.episodes.length > 0) playVideo(data.episodes[0].video_url);
    } catch (e) {
        container.innerHTML = '<p class="text-red-500 text-center py-10">Gagal memuat episode.</p>';
    }
}

// Fungsi Play Video
function playVideo(url) {
    if(!url) return alert("Video tidak tersedia");
    const isM3U8 = url.includes('.m3u8');
    player.src({ src: url, type: isM3U8 ? 'application/x-mpegURL' : 'video/mp4' });
    player.play();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Jalankan pertama kali
document.addEventListener('DOMContentLoaded', () => changeTab('foryou'));

