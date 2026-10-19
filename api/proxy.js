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
        const response = await fetch(target, { headers, redirect: "follow" });

        // Sicherheits- und CORS-Header
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *");

        // Spezialfall: Skai TV – nur den Player extrahieren und zentrieren
        if (target.includes("skai.gr/tv/live")) {
            const html = await response.text();

            // Suche nach möglichen Player-Containern
            const match =
                html.match(/<video[^>]*>[\s\S]*?<\/video>/i) ||
                html.match(/<div[^>]*class="video-player"[^>]*>[\s\S]*?<\/div>/i) ||
                html.match(/<div[^>]*id="live-player"[^>]*>[\s\S]*?<\/div>/i);

            res.setHeader("Content-Type", "text/html; charset=utf-8");

            if (match) {
                const playerHTML = `
                    <html>
                    <head>
                        <style>
                            body {
                                background-color: #000;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                height: 100vh;
                                margin: 0;
                            }
                            video {
                                width: 90%;
                                height: auto;
                                max-height: 90vh;
                                outline: none;
                            }
                        </style>
                    </head>
                    <body>
                        ${match[0]}
                        <script>
                            const vid = document.querySelector('video');
                            if (vid) {
                                vid.setAttribute('controls', 'true');
                                vid.setAttribute('autoplay', 'true');
                                vid.play().catch(()=>{});
                            }
                        </script>
                    </body>
                    </html>
                `;
                res.send(playerHTML);
            } else {
                res.send("<h3 style='color:white;text-align:center;'>Player nicht gefunden</h3>");
            }
            return;
        }

        // Content-Type übernehmen
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);

        // Antwort weiterleiten
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
    } catch (err) {
        res.status(500).json({
            error: "Proxy error",
            details: err.toString()
        });
    }
}
