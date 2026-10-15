const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
    // 1. Erlaube deinem VIDAA TV den Zugriff (CORS-Sperre entfernen)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 2. Extrahiere die Ziel-URL aus dem Parameter (?url=...)
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const targetUrl = urlObj.searchParams.get('url');

    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Fehler: Bitte eine ?url= angeben.');
        return;
    }

    // 3. Anfrage an den griechischen Server senden
    const client = targetUrl.startsWith('https') ? https : http;
    
    client.get(targetUrl, (targetRes) => {
        res.writeHead(targetRes.statusCode, targetRes.headers);
        targetRes.pipe(res);
    }).on('error', (err) => {
        res.writeHead(500);
        res.end('Proxy-Fehler: ' + err.message);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Proxy läuft auf Port ${PORT}`));
