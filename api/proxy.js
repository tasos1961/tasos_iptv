export default async function handler(req, res) {
    const target = req.query.url;
    if (!target) {
        res.status(400).send("Missing ?url=");
        return;
    }

    try {
        const response = await fetch(target, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
                "Referer": target.startsWith("https://www.antenna.gr") ? target : "https://www.antenna.gr/",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const isM3U8 = contentType.includes("mpegurl") || String(target).includes(".m3u8");

        // Respektiere Cache-Control Header vom Origin
        const cacheControl = response.headers.get("cache-control");
        if (cacheControl) {
            res.setHeader("Cache-Control", cacheControl);
        } else if (isM3U8) {
            // Standard-Cache für M3U8: 60 Sekunden
            res.setHeader("Cache-Control", "public, max-age=60");
        } else {
            // Standard-Cache für andere Inhalte: 1 Stunde
            res.setHeader("Cache-Control", "public, max-age=3600");
        }

        if (isM3U8) {
            let playlist = await response.text();

            // HLS URLs im Manifest auf den eigenen Proxy umsetzen
            playlist = playlist.replace(/(https?:\/\/[^\s]+)/g, (match) => {
                const origin = req.headers.host || "tasosiptv.vercel.app";
                const base = `https://${origin}`;
                const proxyUrl = `${base}/api/proxy?url=${encodeURIComponent(match)}`;
                return proxyUrl;
            });

            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.status(200).send(playlist);
            return;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader("Content-Type", contentType);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.status(200).send(buffer);

    } catch (err) {
        res.status(500).send("Proxy error: " + err.toString());
    }
}
