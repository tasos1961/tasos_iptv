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
                "Referer": "https://www.antenna.gr/",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const isM3U8 = contentType.includes("mpegurl") || String(target).includes(".m3u8");
        const isHtml = contentType.includes("text/html");
        const isCss = contentType.includes("text/css");
        const isJs = contentType.includes("javascript") || String(target).includes(".js");

        const cacheControl = response.headers.get("cache-control");
        if (cacheControl) {
            res.setHeader("Cache-Control", cacheControl);
        } else if (isM3U8) {
            res.setHeader("Cache-Control", "public, max-age=60");
        } else if (isHtml) {
            res.setHeader("Cache-Control", "public, max-age=60");
        } else {
            res.setHeader("Cache-Control", "public, max-age=3600");
        }

        if (isHtml) {
            let html = await response.text();
            const origin = req.headers.host || "tasosiptv.vercel.app";
            const base = `https://${origin}`;

            html = html.replace(/(src|href)=(['"])([^'"]+)(\2)/gi, (match, attrName, quote, value) => {
                if (!value || value.includes("/api/proxy?url=") || value.startsWith("data:")) {
                    return match;
                }

                try {
                    const resolved = new URL(value, target).toString();
                    if (!resolved.startsWith("http://") && !resolved.startsWith("https://")) {
                        return match;
                    }
                    return `${attrName}=${quote}${base}/api/proxy?url=${encodeURIComponent(resolved)}${quote}`;
                } catch (err) {
                    return match;
                }
            });

            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.status(200).send(html);
            return;
        }

        if (isM3U8) {
            let playlist = await response.text();

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

        if (isCss || isJs) {
            const text = await response.text();
            res.setHeader("Content-Type", contentType);
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.status(200).send(text);
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
