export default async function handler(req, res) {
    const target = req.query.url;

    if (!target) {
        return res.status(400).send("Missing ?url=");
    }

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
        "Accept": "*/*",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
        "X-Forwarded-For": "2.84.1.22",
        "CF-IPCountry": "GR",
        "Referer": target,
        "Origin": ""
    };

    try {
        const response = await fetch(target, {
            method: req.method,
            headers,
            redirect: "follow"
        });

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);

        if (target.endsWith(".m3u8")) {
            let text = await response.text();
            text = text.replace(/(https?:\/\/[^ ]+)/g, (match) => {
                return `/api/proxy?url=${encodeURIComponent(match)}`;
            });
            return res.send(text);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return res.send(buffer);

    } catch (err) {
        return res.status(500).json({
            error: "Proxy error",
            details: err.toString()
        });
    }
}
