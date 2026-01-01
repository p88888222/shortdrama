const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.use('/api-proxy', createProxyMiddleware({
    target: 'https://api.sansekai.my.id',
    changeOrigin: true,
    pathRewrite: { '^/api-proxy': '' },
}));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

