export default async function handler(req, res) {
    let target = req.query.url;
    if (!target) {
        res.status(400).send("Missing ?url=");
        return;
    }

    // Relative URLs → absolute URLs
    if (target.startsWith("/")) {
        target = "https://www.antenna.gr" + target;
    }

    // Build proxy URL
    const buildProxyUrl = (rawUrl) => {
        const host = req.headers.host;
        return `https://${host}/api/proxy?url=${encodeURIComponent(rawUrl)}`;
    };

    // Allow ALL assets except data:, mailto:, javascript:
    const isAllowedAsset = (rawUrl, baseUrl) => {
        if (!rawUrl) return false;
        if (rawUrl.startsWith("data:")) return false;
        if (rawUrl.startsWith("mailto:")) return false;
        if (rawUrl.startsWith("javascript:")) return false;

        try {
            const url = new URL(rawUrl, baseUrl);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    };

    // Rewrite HTML/CSS/JS asset URLs
    const rewriteAssetUrls = (sourceText, baseUrl) => {
        let text = sourceText;

        // src="" and href=""
        text = text.replace(/(src|href)=(['"])([^'"]+)(\2)/gi, (match, attr, quote, value) => {
            if (!isAllowedAsset(value, baseUrl)) return match;
            return `${attr}=${quote}${buildProxyUrl(value)}${quote}`;
        });

        // url(...)
        text = text.replace(/url\(([^)]+)\)/gi, (match, value) => {
            const clean = value.trim().replace(/^['"]|['"]$/g, "");
            if (!isAllowedAsset(clean, baseUrl)) return match;
            return `url(${buildProxyUrl(clean)})`;
        });

        return text;
    };

    try {
        const response = await fetch(target, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": target,
                "Accept": "*/*"
            }
        });

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const isHtml = contentType.includes("text/html");
        const isCss = contentType.includes("text/css");
        const isJs = contentType.includes("javascript") || target.includes(".js");
        const isM3U8 = contentType.includes("mpegurl") || target.includes(".m3u8");

        // Cache
        res.setHeader("Cache-Control", "public, max-age=60");

        // HTML
        if (isHtml) {
            const html = rewriteAssetUrls(await response.text(), target);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(html);
            return;
        }

        // HLS playlist
        if (isM3U8) {
            let playlist = await response.text();
            playlist = playlist.replace(/(https?:\/\/[^\s]+)/g, (match) => buildProxyUrl(match));
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(playlist);
            return;
        }

        // CSS / JS
        if (isCss || isJs) {
            const text = rewriteAssetUrls(await response.text(), target);
            res.setHeader("Content-Type", contentType);
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(text);
            return;
        }

        // Binary (images, TS segments, fonts, etc.)
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader("Content-Type", contentType);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(buffer);

    } catch (err) {
        res.status(500).send("Proxy error: " + err.toString());
    }
}
