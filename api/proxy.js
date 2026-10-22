export default async function handler(req, res) {
    const target = req.query.url;

    if (!target) {
        return res.status(400).send("Missing ?url=");
    }

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
        "Accept": "*/*",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
        "X-Forwarded-For": "2.84.1.22",
        "CF-IPCountry": "GR",
        "Referer": target,
        "Origin": ""
    };

    try {
        const response = await fetch(target, {
            headers,
            redirect: "follow"
        });

        // Content-Type übernehmen
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);

        // Sicherheits- und CORS-Header
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *");

        // Wenn es KEINE HTML-Seite ist → direkt weiterleiten (z.B. .m3u8, .ts)
        if (!contentType.includes("text/html")) {
            const buffer = Buffer.from(await response.arrayBuffer());
            return res.send(buffer);
        }

        // ⭐ HTML laden
        let html = await response.text();

        // ⭐ Nur megaweb optimieren
        const ismegaweb =
            target.includes("megatv.com") ||
            target.includes("mega") ||
            target.includes("Mega");

        if (ismegaweb) {
            // Body-Abstand entfernen
            html = html.replace(/<body[^>]*>/i, '<body style="margin:0;padding:0;">');

            // Header-Abstand entfernen
            html = html.replace(/<header[^>]*>/i, '<header style="margin:0;padding:0;">');

            // Top-Bar (Mega News / Live TV Buttons) nach oben schieben
            html = html.replace(
                /<div class="top-bar"/i,
                '<div class="top-bar" style="margin-top:-25px;"'
            );

            // Abstand im Hauptbereich entfernen
            html = html.replace(
                /<main[^>]*>/i,
                '<main style="margin:0;padding:0;">'
            );

            // Abstand über dem Player reduzieren
            html = html.replace(
                /<div class="player-container"/i,
                '<div class="player-container" style="margin-top:-20px;"'
            );
        }

        // ⭐ Optimierte HTML zurückgeben
        res.send(html);

    } catch (err) {
        res.status(500).json({
            error: "Proxy error",
            details: err.toString()
        });
    }
}
