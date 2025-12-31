const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

// Jembatan Proxy agar tidak kena blokir browser (CORS)
app.get('/api-proxy', async (req, res) => {
    try {
        const pathParam = req.query.path;
        const shortPlayId = req.query.shortPlayId;
        
        let targetUrl = `https://api.sansekai.my.id/api${pathParam}`;
        if (shortPlayId) targetUrl += `?shortPlayId=${shortPlayId}`;

        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server aktif di port ${PORT}`);
});

