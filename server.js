const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Proxy API dengan penanganan kesalahan yang kuat
app.get('/api-proxy/**', async (req, res) => {
    try {
        const targetPath = req.params[0];
        const queryParams = new URLSearchParams(req.query).toString();
        const targetUrl = `https://api.sansekai.my.id/api/${targetPath}${queryParams ? '?' + queryParams : ''}`;
        
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000 // Batas waktu 10 detik
        });
        res.json(response.data);
    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).json({ error: "API Failure" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
