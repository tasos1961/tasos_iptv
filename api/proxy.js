export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");

    if (!target) {
        return new Response("Missing ?url=", { status: 400 });
    }

    // Cloudflare / CDN Spoofing
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
        "Accept": "*/*",
        "Accept-Language": "el-GR,el;q=0.9,en;q=0.8",
        "X-Forwarded-For": "2.84.1.22",        // griechische IP
        "CF-IPCountry": "GR",
        "Referer": target,
        "Origin": null
    };

    const response = await fetch(target, {
        method: req.method,
        headers,
        redirect: "follow"
    });

    // CORS entfernen
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Headers", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");

    // HLS-Segment-Rewrite
    if (target.endsWith(".m3u8")) {
        let text = await response.text();
        text = text.replace(/(https?:\/\/[^ ]+)/g, (match) => {
            return `/proxy?url=${encodeURIComponent(match)}`;
        });
        return new Response(text, { headers: newHeaders });
    }

    return new Response(response.body, { headers: newHeaders });
}
