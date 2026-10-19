export default function handler(req, res) {
    res.status(200).json({
        status: "OK",
        message: "Die API funktioniert!",
        url: req.query.url || null
    });
}
