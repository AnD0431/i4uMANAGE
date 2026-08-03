// api/gemini.js
// Serverless function (Vercel). Browser panggil endpoint ni ("/api/gemini"),
// bukan terus ke Google — jadi API key tak pernah terdedah dalam kod client-side.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // API_KEY diambil dari Environment Variable di Vercel — TIDAK ditulis dalam kod.
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = "gemini-3.6-flash"; // tukar ikut model sah semasa awak nak guna

  const GOOGLE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const googleResponse = await fetch(GOOGLE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body), // hantar terus payload yang sama dari scripts.js
    });

    const data = await googleResponse.json();
    return res.status(googleResponse.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: "Server error: " + err.message } });
  }
}