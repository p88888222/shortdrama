const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// PROXY API: Menghindari CORS Error
app.get('/api-proxy/**', async (req, res) => {
    try {
        const targetPath = req.params[0]; // mengambil bagian setelah /api-proxy/
        const queryParams = new URLSearchParams(req.query).toString();
        const targetUrl = `https://api.sansekai.my.id/api/${targetPath}${queryParams ? '?' + queryParams : ''}`;
        
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data dari API" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server aktif di port ${PORT}`);
});
