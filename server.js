const express = require('express');
const { createServer } = require('http');
// const { Server } = require('socket.io');
const next = require('next');

console.log('--- MINIMAL SERVER.JS STARTING ---');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();

    // Intercept at HTTP level
    const httpServer = createServer((req, res) => {
        console.log(`[HTTP] request: ${req.url}`);
        if (req.url === '/ping' || req.url === '/ping/') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('PONG_MINIMAL');
            return;
        }
        server(req, res);
    });

    // NO SOCKET IO

    server.get('/api/health', (req, res) => {
        res.status(200).json({ status: 'ok', mode: 'minimal' });
    });

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, '0.0.0.0', (err) => {
        if (err) throw err;
        console.log(`> Ready on http://0.0.0.0:${port}`);
    });
}).catch(err => {
    console.error('Error preparing app:', err);
    process.exit(1);
});
