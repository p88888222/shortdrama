const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
// Railway akan memberikan port secara dinamis, jangan diubah
const PORT = process.env.PORT || 3000;

app.use(cors());

// Baris ini sangat penting agar index.html bisa dibaca oleh browser
app.use(express.static(path.join(__dirname, '.')));

// Jembatan Proxy API
app.get('/api-proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'URL diperlukan' });

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000 // Maksimal 10 detik
        });
        res.json(response.data);
    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ 
            error: 'Gagal mengambil data dari API Sansekai',
            details: error.message 
        });
    }
});

// Pastikan rute utama mengirim index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server aktif di port ${PORT}`);
});

