const BASE_URL = "https://api.sansekai.my.id/api/netshort";

async function fetchData(endpoint) {
    const container = document.getElementById('content-list');
    
    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`);
        const result = await response.json();
        const items = result.data || [];

        if (items.length === 0) {
            container.innerHTML = `<div class="h-screen flex items-center justify-center text-zinc-500">Video tidak ditemukan.</div>`;
            return;
        }

        // Render ala NetShort (Full Vertical)
        container.innerHTML = items.map((item, index) => `
            <div class="snap-item w-full bg-black">
                <video 
                    class="w-full h-full object-cover"
                    src="${item.url}" 
                    loop 
                    onclick="this.paused ? this.play() : this.pause()"
                    playsinline
                ></video>

                <div class="absolute bottom-28 left-4 right-16 pointer-events-none">
                    <h3 class="text-lg font-bold mb-1 shadow-sm">${item.title || 'Short Drama'}</h3>
                    <p class="text-sm text-zinc-200 line-clamp-2">${item.description || 'Nonton episode lengkapnya sekarang.'}</p>
                </div>

                <div class="absolute bottom-32 right-4 flex flex-col gap-6 items-center">
                    <div class="flex flex-col items-center">
                        <span class="text-2xl">❤️</span>
                        <span class="text-[10px]">Like</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="text-2xl">💬</span>
                        <span class="text-[10px]">Com</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="text-2xl">↗️</span>
                        <span class="text-[10px]">Share</span>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = `<div class="h-screen flex items-center justify-center text-red-500">API Error. Coba lagi nanti.</div>`;
    }
}

function changeTab(endpoint) {
    fetchData(endpoint);
}

// Inisialisasi awal
window.onload = () => fetchData('theaters');
