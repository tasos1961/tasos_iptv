export default async function handler(req, res) {
    try {
        // MegaTV Live-Seite abrufen
        const response = await fetch("https://www.megatv.com/live", {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        let html = await response.text();

        // Nur den Player extrahieren
        const match = html.match(/<div class="video-container"[\\s\\S]*?<\\/div>/);

        if (!match) {
            return res.status(500).send("Player nicht gefunden");
        }

        const playerHTML = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #000;
                        overflow: hidden;
                    }
                    .video-container {
                        width: 100%;
                        height: 100%;
                    }
                    iframe, video {
                        width: 100%;
                        height: 100%;
                    }
                </style>
            </head>
            <body>
                ${match[0]}
            </body>
            </html>
        `;

        res.setHeader("Content-Type", "text/html");
        res.send(playerHTML);

    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Laden des Mega‑Players");
    }
}
