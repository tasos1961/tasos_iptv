export default async function handler(req, res) {
    // 🧩 1. CORS‑Vorabprüfung (OPTIONS / Preflight) für Smart-TVs abfangen
    // Das bricht die Sperre für den Sender 81.171.10.42 komplett auf!
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // 🔒 2. Login‑Check
    const cookies = req.headers.cookie || '';
    if (!cookies.includes('authorized_user=true')) {
        return res.status(403).send("Zugriff verweigert. Bitte zuerst einloggen!");
    }

    const target = req.query.url;
    if (!target) {
        return res.status(400).send("Missing ?url=");
    }

    // 🧩 3. Standard‑Header (inklusive getarnter Identität)
    let headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
        "Accept": "*/*",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
        "X-Forwarded-For": "2.84.1.22",
        "CF-IPCountry": "GR",
        "Referer": target,
        "Origin": ""
    };

    // 🧩 4. Spezial‑Header für Skai‑Domains
    const isSkai =
        target.includes("skai.gr") ||
        target.includes("player.skai.gr") ||
        target.includes("cdn.skai.gr") ||
        target.includes("akamaized.net");

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

// Erzwinge korrekte MIME-Typen für HLS
if (target.endsWith(".m3u8")) {
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
} else if (target.endsWith(".ts")) {
    res.setHeader("Content-Type", "video/mp2t");
} else {
    res.setHeader("Content-Type", contentType);
}

if (!contentType.includes("text/html")) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(response.status);
    return res.send(buffer);
}


        // 🧩 6. HTML laden (für MegaWeb und SkaiWeb)
        let html = await response.text();

        // 🧩 MegaWeb‑Optimierung
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

        // 🧩 SkaiWeb – automatische Umschreibung eingebetteter Ressourcen
        if (isSkai) {
            html = html.replace(/src="https:\/\/(.*?)"/g, (match, p1) => {
                return `src="/api/proxy?url=https://${p1}"`;
            });
            html = html.replace(/href="https:\/\/(.*?)"/g, (match, p1) => {
                return `href="/api/proxy?url=https://${p1}"`;
            });
        }

        // 🧩 Optimierte HTML zurückgeben
        res.send(html);

    } catch (err) {
        res.status(500).json({
            error: "Proxy error",
            details: err.toString()
        });
    }
}
