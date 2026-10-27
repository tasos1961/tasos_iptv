export default async function handler(req, res) {

    // 🔒 Login‑Check
    const cookies = req.headers.cookie || '';
    if (!cookies.includes('authorized_user=true')) {
        return res.status(403).send("Zugriff verweigert. Bitte zuerst einloggen!");
    }

    const target = req.query.url;
    if (!target) {
        return res.status(400).send("Missing ?url=");
    }

    // ⭐ Standard‑Header
    let headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
        "Accept": "*/*",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
        "X-Forwarded-For": "2.84.1.22",
        "CF-IPCountry": "GR",
        "Referer": target,
        "Origin": ""
    };

    // ⭐ SPEZIAL: SkaiWeb braucht echten Referer + Origin
    const isSkai =
        target.includes("skai.gr") ||
        target.includes("skai") ||
        target.includes("Skai");

    if (isSkai) {
        headers = {
            ...headers,
            "Referer": "https://www.skai.gr/",
            "Origin": "https://www.skai.gr"
        };
    }

    try {
        const response = await fetch(target, {
            headers,
            redirect: "follow"
        });

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);

        // ⭐ CORS + Frame‑Erlaubnis
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *");

        // ⭐ Nicht‑HTML → direkt weiterleiten (m3u8, ts, jpg, js, css)
        if (!contentType.includes("text/html")) {
            const buffer = Buffer.from(await response.arrayBuffer());
            return res.send(buffer);
        }

        // ⭐ HTML laden
        let html = await response.text();

        // ⭐ MegaWeb‑Optimierung (unverändert)
        const isMegaWeb =
            target.includes("megatv.com") ||
            target.includes("mega") ||
            target.includes("Mega");

        if (isMegaWeb) {
            html = html.replace(/<body[^>]*>/i, '<body style="margin:0;padding:0;">');
            html = html.replace(/<header[^>]*>/i, '<header style="margin:0;padding:0;">');
            html = html.replace(/<div class="top-bar"/i, '<div class="top-bar" style="margin-top:-25px;"');
            html = html.replace(/<main[^>]*>/i, '<main style="margin:0;padding:0;">');
            html = html.replace(/<div class="player-container"/i, '<div class="player-container" style="margin-top:-20px;"');
        }

        // ⭐ SkaiWeb → KEINE HTML‑Änderungen
        // (nur Header‑Manipulation oben)

        res.send(html);

    } catch (err) {
        res.status(500).json({
            error: "Proxy error",
            details: err.toString()
        });
    }
}
