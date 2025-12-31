const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Melayani file statis dari folder root
app.use(express.static(__dirname));

// Mengarahkan semua request ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
