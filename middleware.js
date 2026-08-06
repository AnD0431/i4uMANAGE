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
    // FIXED: request.cookies.get() adalah API khas Next.js — projek statik
    // biasa (bukan Next.js) bagi "request" sebagai objek standard Web API
    // yang TIADA .cookies, jadi panggilan tu crash (500
    // MIDDLEWARE_INVOCATION_FAILED). Parse header "Cookie" mentah secara
    // manual sebagai gantinya.
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
        cookieHeader
            .split(";")
            .map(c => c.trim().split("="))
            .filter(pair => pair.length === 2)
    );

    if (cookies["jknt_auth"] !== process.env.AUTH_SECRET) {
        const loginUrl = new URL("/login.html", request.url);
        return Response.redirect(loginUrl, 307);
    }

    // Cookie sah — teruskan ke page yang diminta
    return;
}