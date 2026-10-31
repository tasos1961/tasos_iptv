export default async function handler(req, res) {
    // 🧩 1. CORS‑Vorabprüfung (OPTIONS / Preflight)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    if (req.method === "OPTIONS") return res.status(200).end();

    // 🔒 2. Login‑Check
    const cookies = req.headers.cookie || "";
    if (!cookies.includes("authorized_user=true"))
        return res.status(403).send("Zugriff verweigert. Bitte zuerst einloggen!");

    const target = req.query.url;
    if (!target) return res.status(400).send("Missing ?url=");

    // 🧩 3. Standard‑Header
    let headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
        "Accept": "*/*",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
        "X-Forwarded-For": "2.84.1.22",
        "CF-IPCountry": "GR",
        "Referer": target,
        "Origin": ""
    };

    // ⭐ ANT1FREE‑Fix
    const isAnt1 =
        target.includes("antennaplus.gr") ||
        target.includes("antenna") ||
        target.includes("media0/Ant1");

   if (isAnt1) {
    headers = {
        ...headers,
        "Referer": "https://www.antenna.gr/live",
        "Origin": "https://www.antenna.gr",
        "User-Agent": "Mozilla/5.0 (SMART-TV; Linux; Android 11; SofronovIPTV)",
        "Accept": "*/*",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
        "X-Forwarded-For": "2.84.1.22",
        "CF-IPCountry": "GR",
        // 👉 zusätzlich:
        "Host": "mcdn.antennaplus.gr",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    };
}


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
        const response = await fetch(target, { headers, redirect: "follow" });

        // 🧩 5. MIME‑Typen
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        if (target.endsWith(".m3u8")) res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        else if (target.endsWith(".ts")) res.setHeader("Content-Type", "video/mp2t");
        else res.setHeader("Content-Type", contentType);

        // 🧩 6. Nicht‑HTML‑Inhalte direkt weiterleiten
        if (!contentType.includes("text/html")) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.status(response.status);
            return res.send(buffer);
        }

        // 🧩 7. HTML‑Optimierungen
        let html = await response.text();

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

        if (isSkai) {
            html = html.replace(/src="https:\/\/(.*?)"/g, (m, p1) => `src="/api/proxy?url=https://${p1}"`);
            html = html.replace(/href="https:\/\/(.*?)"/g, (m, p1) => `href="/api/proxy?url=https://${p1}"`);
        }

        res.send(html);
    } catch (err) {
        res.status(500).json({
            error: "Proxy error",
            details: err.toString()
        });
    }
}
