const http = require('http');

console.log('STARTING RAW SERVER');
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
    console.log(`REQ: ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`RAW_SERVER_ACTIVE: ${req.url}`);
}).listen(port, '0.0.0.0', () => {
    console.log(`Listening on ${port}`);
});
