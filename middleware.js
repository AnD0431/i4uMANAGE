// middleware.js
// Vercel Edge Middleware — jalan SEBELUM mana-mana page dipapar.
// Check cookie "jknt_auth" pada setiap request. Kalau tiada/salah,
// redirect terus ke login.html.

export const config = {
    // Lindungi SEMUA page/route KECUALI: fail dalam api/, login.html
    // sendiri, dan folder statik (css/js/image) supaya login.html masih
    // boleh load styling & script dia.
    matcher: [
        "/((?!api/|login\\.html|css/|js/|image/|favicon\\.ico).*)",
    ],
};

export default function middleware(request) {
    const cookie = request.cookies.get("jknt_auth");

    if (!cookie || cookie.value !== process.env.AUTH_SECRET) {
        const loginUrl = new URL("/login.html", request.url);
        return Response.redirect(loginUrl, 307);
    }

    // Cookie sah — teruskan ke page yang diminta
    return;
}