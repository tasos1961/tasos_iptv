export default async function handler(req, res) {
    const target = req.query.url;
    if (!target) {
        res.status(400).send("Missing ?url=");
        return;
    }

    try {
        const response = await fetch(target, {
            headers: {
                "User-Agent": "Mozilla/5.0 (SmartTV; VIDAA; Opera)",
                "Referer": "https://www.antenna.gr/",
                "Accept": "*/*"
            }
        });

        const body = await response.text();

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

        res.status(200).send(body);
    } catch (err) {
        res.status(500).send("Proxy error: " + err.toString());
    }
}
