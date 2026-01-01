const API_BASE = "/api-proxy";
let currentMode = 'home';
let history = JSON.parse(localStorage.getItem('dramaxin_history') || '[]');
let bookmarks = JSON.parse(localStorage.getItem('dramaxin_bookmarks') || '[]');

/**
 * 1. FUNGSI NAVIGASI UTAMA
 */
async function switchView(mode, el) {
    currentMode = mode;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('nav-active'));
    el.classList.add('nav-active');
    
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="py-20 text-center animate-pulse text-red-600 font-bold uppercase tracking-widest text-xs">Menghubungkan Database...</div>';

    if (mode === 'home') loadHome();
    else if (mode === 'hot') loadHot();
    else if (mode === 'library') loadLibrary();
}

/**
 * 2. HOME: Menampilkan kategori "Terbaru", "Akan Datang", dan "Pilihan"
 * Menghindari drama viral yang sudah ada di tab Hot.
 */
async function loadHome() {
    const data = await apiGet('/netshort/theaters');
    const content = document.getElementById('appContent');
    content.innerHTML = "";

    if (Array.isArray(data)) {
        // Filter kategori agar tidak menampilkan yang berbau "Viral" atau "Populer" jika memungkinkan
        data.forEach(category => {
            const name = category.contentName?.toUpperCase() || "";
            // Logika filter sederhana untuk membedakan Home dan Hot
            if (!name.includes("HOT") && !name.includes("VIRAL") && !name.includes("TRENDING")) {
                renderSection(category, content);
            }
        });
    }
}

/**
 * 3. HOT: Khusus menampilkan drama yang Sedang Viral atau Trending
 */
async function loadHot() {
    const data = await apiGet('/netshort/foryou');
    const content = document.getElementById('appContent');
    content.innerHTML = "";

    if (Array.isArray(data)) {
        data.forEach(category => {
            const name = category.contentName?.toUpperCase() || "";
            if (name.includes("HOT") || name.includes("VIRAL") || name.includes("TRENDING") || name.includes("POPULER")) {
                renderSection(category, content);
            }
        });
    } else {
        renderStandardGrid(data, "TRENDING SEKARANG");
    }
}

function renderSection(category, container) {
    const section = document.createElement('section');
    section.className = "mb-8";
    section.innerHTML = `
        <div class="flex items-center gap-2 mb-4">
            <div class="w-1 h-3 bg-red-600 rounded-full"></div>
            <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${category.contentName}</h2>
        </div>
        <div class="grid grid-cols-3 gap-3"></div>
    `;
    const grid = section.querySelector('.grid');
    (category.contentInfos || []).forEach(item => {
        grid.appendChild(createDramaCard(item));
    });
    container.appendChild(section);
}

/**
 * 4. LIBRARY: Perbaikan Gambar & Episode Terakhir
 */
function loadLibrary() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
        <div class="space-y-10">
            <section>
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terakhir Ditonton</h2>
                </div>
                <div id="historyGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
            <section>
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-1 h-3 bg-red-600 rounded-full"></div>
                    <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Koleksi Saya</h2>
                </div>
                <div id="bookmarkGrid" class="grid grid-cols-3 gap-3"></div>
            </section>
        </div>
    `;

    const histGrid = document.getElementById('historyGrid');
    const bookGrid = document.getElementById('bookmarkGrid');
    
    if (history.length) {
        history.forEach(item => {
            // Perbaikan: Pastikan data cover tersimpan dengan benar di history
            histGrid.appendChild(createDramaCard(item, true)); 
        });
    } else {
        histGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-30 italic py-4">Belum ada riwayat nonton.</p>';
    }
    
    if (bookmarks.length) {
        bookmarks.forEach(item => bookGrid.appendChild(createDramaCard(item)));
    } else {
        bookGrid.innerHTML = '<p class="col-span-full text-[10px] opacity-30 italic py-4">Belum ada bookmark.</p>';
    }
}

/**
 * 5. HELPER: Perbaikan URL Cover & Badge Episode
 */
function createDramaCard(item, isHistory = false) {
    const spId = item.shortPlayId || item.id;
    const spName = item.shortPlayName || item.title;
    
    // Tampilkan episode terakhir jika ini adalah history
    const displayEp = isHistory ? `EP ${item.lastEp}` : `${item.totalEpisode || item.total || '??'} EP`;
    
    // Perbaikan URL Gambar agar tidak broken
    const rawCover = item.cover || item.shortPlayCover || item.groupShortPlayCover;
    const finalCover = rawCover?.startsWith('http') ? rawCover : `https://api.sansekai.my.id${rawCover?.startsWith('/') ? '' : '/'}${rawCover}`;

    const div = document.createElement('div');
    div.className = "cursor-pointer active:scale-95 transition-all duration-200";
    div.onclick = () => openDetail(spId, spName, item.shotIntroduce || item.intro, item.totalEpisode || item.total);
    
    div.innerHTML = `
        <div class="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 mb-1 relative border border-white/5 shadow-lg">
            <img src="${finalCover}" class="w-full h-full object-cover" 
                 onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="absolute bottom-1 right-1 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-xl">
                ${displayEp}
            </div>
        </div>
        <h3 class="text-[9px] font-bold line-clamp-2 text-gray-400 px-1 uppercase leading-tight tracking-tighter">${spName}</h3>`;
    return div;
}

// Tambahkan di fungsi saveHistory agar data lengkap tersimpan
function saveHistory(id, title, total, ep, cover) {
    const item = { id, title, total, lastEp: ep, cover, time: Date.now() };
    history = history.filter(h => h.id !== id);
    history.unshift(item);
    if (history.length > 9) history.pop();
    localStorage.setItem('dramaxin_history', JSON.stringify(history));
}

// Pastikan memanggil saveHistory dengan data cover di dalam fungsi play episode
// Contoh: saveHistory(id, title, total, i+1, finalCover);

