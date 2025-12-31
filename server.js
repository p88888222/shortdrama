const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Melayani file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Kirim index.html untuk semua rute (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

