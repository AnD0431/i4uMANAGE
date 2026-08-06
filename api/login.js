// api/login.js
// Terima password dari login.html, banding dengan STAFF_PASSWORD
// (Environment Variable — TIDAK ditulis dalam kod). Kalau betul, set
// cookie httpOnly "jknt_auth" yang disemak oleh middleware.js pada
// setiap request seterusnya.

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { password } = req.body || {};

    if (!password || password !== process.env.STAFF_PASSWORD) {
        return res.status(401).json({ success: false, message: "Password salah." });
    }

    // Cookie sah selama 30 hari (2592000 saat) — staff tak perlu login
    // semula setiap kali buka website dalam tempoh tu.
    res.setHeader(
        "Set-Cookie",
        `jknt_auth=${process.env.AUTH_SECRET}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
    );

    return res.status(200).json({ success: true });
}
