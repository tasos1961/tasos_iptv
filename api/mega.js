export default async function handler(req, res) {
  try {
    const response = await fetch("https://www.megatv.com/live", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let html = await response.text();

    // Player-Container suchen
    const match = html.match(/<div class="video-container"[\s\S]*?<\/div>/i);

    if (!match) {
      // Wenn kein Player gefunden wird, zeige eine einfache Fehlermeldung
      res.status(200).send(`
        <html><body style="background:#000;color:#fff;font-family:sans-serif;">
        <h2>Player nicht gefunden</h2>
        <p>Die MegaTV-Seite hat sich geändert oder blockiert den Zugriff.</p>
        </body></html>
      `);
      return;
    }

    // Nur den Player anzeigen
    const playerHTML = `
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin:0; padding:0; background:#000; overflow:hidden; }
          .video-container { width:100%; height:100%; }
          iframe, video { width:100%; height:100%; }
        </style>
      </head>
      <body>
        ${match[0]}
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(playerHTML);
  } catch (err) {
    console.error("Mega.js Fehler:", err);
    res.status(500).send(`
      <html><body style="background:#000;color:#fff;font-family:sans-serif;">
      <h2>Fehler beim Laden des MegaTV-Players</h2>
      <p>${err.message}</p>
      </body></html>
    `);
  }
}
