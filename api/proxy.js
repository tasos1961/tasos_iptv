export default async function handler(req, res) {
    const target = req.query.url;
    if (!target) {
        res.status(400).send("Missing ?url=");
        return;
    }

    const buildProxyUrl = (rawUrl) => {
        const host = req.headers.host || "tasosiptv.vercel.app";
        const base = `https://${host}`;
        return `${base}/api/proxy?url=${encodeURIComponent(rawUrl)}`;
    };

    const isAllowedAsset = (rawUrl, baseUrl) => {
        if (!rawUrl) return false;
        if (rawUrl.startsWith("data:") || rawUrl.startsWith("#") || rawUrl.startsWith("mailto:")) return false;

        try {
            const url = new URL(rawUrl, baseUrl);
            const host = url.hostname.toLowerCase();
            const blocked = [
                "google.", "googletagmanager", "doubleclick", "google-analytics",
                "analytics.google.com", "pubmatic", "adservice.google.", "segment.com",
                "smartadserver", "facebook.net", "facebook.com", "googlesyndication", "amazon-adsystem"
            ];

            if (url.protocol !== "http:" && url.protocol !== "https:") return false;
            if (blocked.some((part) => host.includes(part))) return false;

            return host === "antenna.gr" || host.endsWith(".antenna.gr") || host === new URL(baseUrl).hostname;
        } catch {
            return false;
        }
    };

    const rewriteAssetUrls = (sourceText, baseUrl) => {
        let text = sourceText;

        text = text.replace(/(src|href)=(['"])([^'"]+)(\2)/gi, (match, attr, quote, value) => {
            if (!isAllowedAsset(value, baseUrl)) return match;
            return `${attr}=${quote}${buildProxyUrl(value)}${quote}`;
        });

        text = text.replace(/url\(([^)]+)\)/gi, (match, value) => {
            const cleanValue = value.trim().replace(/^['"]|['"]$/g, "");
            if (!isAllowedAsset(cleanValue, baseUrl)) return match;
            return `url(${buildProxyUrl(cleanValue)})`;
        });

        return text;
    };

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
            const html = rewriteAssetUrls(await response.text(), target);
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
                return buildProxyUrl(match);
            });

            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.status(200).send(playlist);
            return;
        }

        if (isCss || isJs) {
            const text = rewriteAssetUrls(await response.text(), target);
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
