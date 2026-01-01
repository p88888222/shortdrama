const API_BASE = "/api-proxy";
let epData = [], currentEpIndex = -1, controlTimeout, activeDrama = null;
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

const player = document.getElementById('mainPlayer');
const playIcon = document.getElementById('playIcon');
const videoControls = document.getElementById('videoControls');
const seekBar = document.getElementById('seekBar');
const hls = new Hls();

// --- 1. LOGIKA AUTOHIDE (FIXED) ---
function showControls() {
    videoControls.classList.remove('opacity-0', 'pointer-events-none');
    videoControls.classList.add('opacity-100', 'pointer-events-auto');
    clearTimeout(controlTimeout);
    controlTimeout = setTimeout(() => {
        if (!player.paused) {
            videoControls.classList.remove('opacity-100', 'pointer-events-auto');
            videoControls.classList.add('opacity-0', 'pointer-events-none');
        }
    }, 3000);
}

document.getElementById('videoContainer').addEventListener('mousemove', showControls);
document.getElementById('videoContainer').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') showControls();
});

// --- 2. LOGIKA PLAYER & M3U8 (FIXED) ---
function togglePlay() {
    if (player.paused) {
        player.play();
        playIcon.className = "fa-solid fa-pause";
    } else {
        player.pause();
        playIcon.className = "fa-solid fa-play ml-1";
    }
    showControls();
}

function playEp(idx) {
    if (!epData[idx]) return;
    currentEpIndex = idx;
    const ep = epData[idx];
    const videoUrl = ep.playVoucher || ep.videoUrl;
    const subUrl = ep.url || ep.subtitleUrl || ep.m3u8SubtitleUrl;

    // Bersihkan track subtitle lama
    const tracks = player.querySelectorAll('track');
    tracks.forEach(t => t.remove());

    // Dukungan M3U8 & Kualitas Video (Hls.js)
    if (videoUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
            hls.loadSource(videoUrl);
            hls.attachMedia(player);
        } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
            player.src = videoUrl;
        }
    } else {
        player.src = videoUrl;
    }

    // GABUNGKAN SUBTITLE OTOMATIS (inject url)
    if (subUrl) {
        const track = document.createElement('track');
        track.kind = "subtitles";
        track.label = "Indonesia";
        track.srclang = "id";
        track.src = subUrl;
        track.default = true;
        player.appendChild(track);
        // Paksa tampilkan subtitle
        player.textTracks[0].mode = 'showing';
    }

    player.play();
    playIcon.className = "fa-solid fa-pause";
    showControls();

    // Highlight Tombol Episode
    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('ep-active'));
    document.getElementById(`ep-btn-${idx}`)?.classList.add('ep-active');

    // Save History (Maksimal 6)
    const histItem = { ...activeDrama, lastEp: idx + 1 };
    history = [histItem, ...history.filter(h => h.id !== activeDrama.id)].slice(0, 6);
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

// --- 3. AUTO-SYNC EPISODE COVER (FIXED) ---
async function startBackgroundSync() {
    const elms = document.querySelectorAll('.sync-ep');
    for (let el of elms) {
        if (el.innerText.includes('??')) {
            await new Promise(r => setTimeout(r, 400));
            fetch(`${API_BASE}/netshort/allepisode?shortPlayId=${el.dataset.id}`)
                .then(r => r.json())
                .then(j => {
                    const total = j.data?.totalEpisode || j.totalEpisode;
                    if (total) el.innerText = total + " EP";
                }).catch(() => {});
        }
    }
}

// --- FUNGSI PENDUKUNG LAINNYA ---
async function openDetail(id, title, cover, startEp = 1) {
    const modal = document.getElementById('detailModal');
    player.pause(); player.src = "";
    modal.classList.remove('hidden');
    document.body.style.overflow = "hidden";
    
    document.getElementById('modalTitle').innerText = title;
    const res = await fetch(`${API_BASE}/netshort/allepisode?shortPlayId=${id}`).then(r => r.json()).then(j => j.data || j);
    
    epData = res?.shortPlayEpisodeInfos || [];
    activeDrama = { id, title, cover, intro: res?.shotIntroduce || "No desc.", total: res?.totalEpisode || epData.length || 0 };
    
    document.getElementById('modalDesc').innerText = activeDrama.intro;
    document.getElementById('modalTotalEp').innerText = `${activeDrama.total} EPISODES`;
    
    const epList = document.getElementById('modalEpisodes');
    epList.innerHTML = "";
    epData.forEach((ep, i) => {
        const btn = document.createElement('button');
        btn.id = `ep-btn-${i}`;
        btn.className = "ep-btn w-full text-left glass p-4 rounded-xl flex justify-between items-center text-xs";
        btn.onclick = () => playEp(i);
        btn.innerHTML = `<span class="font-bold">EPISODE ${ep.episodeNo || i+1}</span><i class="fa-solid fa-play text-red-500 text-[10px]"></i>`;
        epList.appendChild(btn);
    });
    playEp(startEp - 1);
}

// ... Sisanya tetap sama (switchView, renderContent, createDramaCard, formatTime, toggleFullscreen) ...
// (Tambahkan fungsi createDramaCard yang menyertakan class 'sync-ep' dan 'data-id')

