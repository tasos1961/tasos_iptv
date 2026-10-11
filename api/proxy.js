export default async function handler(req, res) {
    const target = req.query.url;
    if (!target) {
        res.status(400).send("Missing ?url=");
        return;
    }

    try {
        const response = await fetch(target, {
            headers: {
                "User-Agent": "Mozilla/5.0 (SmartTV; VIDAA; Opera)",
                "Referer": "https://www.antenna.gr/tv",
                "Accept": "*/*"
            }
        });

        const contentType = response.headers.get("content-type");

        // Wenn es eine M3U8 Playlist ist → umschreiben
        if (contentType && contentType.includes("application/vnd.apple.mpegurl")) {
            let playlist = await response.text();

            // Jede Segment-URL umschreiben → auf unseren Proxy zeigen
            playlist = playlist.replace(/(https?:\/\/[^\s]+)/g, (match) => {
                return `${req.headers.host}/api/proxy?url=${encodeURIComponent(match)}`;
            });

            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(playlist);
            return;
        }

        // Normale TS-Segmente oder andere Dateien
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader("Content-Type", contentType || "application/octet-stream");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(buffer);

    } catch (err) {
        res.status(500).send("Proxy error: " + err.toString());
    }
}

