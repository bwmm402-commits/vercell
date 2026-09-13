const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const sql = neon(process.env.DATABASE_URL);

const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const resendLimiter = new Map();

const RESEND_COOLDOWN = 60 * 1000;

// --------------------------------------------------
// RESPONSE
// --------------------------------------------------

function json(res, status, data) {
    res.statusCode = status;

    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );

    res.end(JSON.stringify(data));
}

// --------------------------------------------------
// COOKIE
// --------------------------------------------------

function cookie(res, name, value, options = {}) {

    const parts = [
        `${name}=${value}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax"
    ];

    if (options.maxAge != null) {
        parts.push(`Max-Age=${options.maxAge}`);
    }

    if (process.env.NODE_ENV === "production") {
        parts.push("Secure");
    }

    res.setHeader(
        "Set-Cookie",
        parts.join("; ")
    );
}

function clearCookie(res, name) {
    cookie(res, name, "", {
        maxAge: 0
    });
}

// --------------------------------------------------
// COOKIES
// --------------------------------------------------

function getCookies(req) {

    const raw = req.headers.cookie || "";

    return Object.fromEntries(
        raw
            .split(";")
            .filter(Boolean)
            .map(part => {

                const i = part.indexOf("=");

                return [
                    part.slice(0, i).trim(),
                    decodeURIComponent(
                        part.slice(i + 1).trim()
                    )
                ];
            })
    );
}

// --------------------------------------------------
// CRYPTO
// --------------------------------------------------

function hashToken(value) {

    return crypto
        .createHash("sha256")
        .update(value)
        .digest("hex");
}

function makeCode() {

    return String(
        crypto.randomInt(
            100000,
            1000000
        )
    );
}

function makeToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");
}

// --------------------------------------------------
// USER
// --------------------------------------------------

function safeUser(row, admin = false) {

    return {
        id: row.id,

        username: row.username,

        displayName: row.display_name,

        email: row.email,

        xp: row.xp,

        coins: row.coins,

        downloads: row.downloads,

        verified: Boolean(
            row.email_verified
        ),

        theme: row.theme || "dark",

        admin
    };
}

// --------------------------------------------------
// JWT
// --------------------------------------------------

function signSession(user) {

    return jwt.sign(
        {
            sub: user.id,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

// --------------------------------------------------
// CURRENT USER
// --------------------------------------------------

async function currentUser(req) {

    try {

        const token =
            getCookies(req).m53g_session;

        if (!token) {
            return null;
        }

        const payload =
            jwt.verify(
                token,
                JWT_SECRET
            );

        const rows = await sql`
            SELECT *
            FROM profiles
            WHERE id = ${payload.sub}
            LIMIT 1
        `;

        if (!rows.length) {
            return null;
        }

        const row = rows[0];

        if (!row.email_verified) {
            return null;
        }

        return safeUser(
            row,
            row.email.toLowerCase() ===
                ADMIN_EMAIL
        );

    } catch {

        return null;
    }
}

// --------------------------------------------------
// EMAIL ESCAPE
// --------------------------------------------------

function escapeMail(value) {

    return String(value).replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c])
    );
}

// --------------------------------------------------
// VERIFICATION EMAIL
// --------------------------------------------------

function verificationEmail(
    username,
    code
) {

    return `
<!doctype html>

<html lang="tr">

<head>
<meta charset="UTF-8">
</head>

<body style="
margin:0;
background:#030303;
color:#fff;
font-family:Arial,sans-serif;
">

<div style="
max-width:620px;
margin:30px auto;
padding:30px;
background:#0d0d12;
border:1px solid #252535;
border-radius:18px;
">

<div style="
font-size:30px;
font-weight:900;
letter-spacing:4px;
">

M53G

</div>

<h2>
E-posta Doğrulama
</h2>

<p style="color:#aaa">
Merhaba
<b>${escapeMail(username)}</b> 👋
</p>

<p style="color:#aaa">
M53G hesabını doğrulamak için
aşağıdaki 6 haneli kodu kullan:
</p>

<div style="
margin:28px 0;
padding:22px;
text-align:center;
background:#08080d;
border:1px solid #343454;
border-radius:14px;
font-size:40px;
font-weight:900;
letter-spacing:10px;
">

${code}

</div>

<p style="color:#888">
Bu kod <b>10 dakika</b> geçerlidir.
</p>

<p style="color:#666">
Bu isteği sen yapmadıysan bu e-postayı
yok sayabilirsin.
</p>

<hr style="
border:0;
border-top:1px solid #222;
">

<small style="color:#666">
M53G Gaming & Development Platform
</small>

</div>

</body>
</html>
`;
}

// --------------------------------------------------
// RESET EMAIL
// --------------------------------------------------

function resetEmail(
    username,
    link
) {

    return `
<!doctype html>

<html lang="tr">

<head>
<meta charset="UTF-8">
</head>

<body style="
margin:0;
background:#030303;
color:#fff;
font-family:Arial,sans-serif;
">

<div style="
max-width:620px;
margin:30px auto;
padding:30px;
background:#0d0d12;
border:1px solid #252535;
border-radius:18px;
">

<div style="
font-size:30px;
font-weight:900;
letter-spacing:4px;
">

M53G

</div>

<h2>
Şifre Sıfırlama
</h2>

<p style="color:#aaa">

Merhaba
<b>${escapeMail(username)}</b> 👋

</p>

<p style="color:#aaa">

M53G hesabının şifresini değiştirmek
için aşağıdaki butona tıkla.

</p>

<p>

<a
href="${escapeMail(link)}"
style="
display:inline-block;
padding:13px 20px;
background:#fff;
color:#000;
text-decoration:none;
border-radius:10px;
font-weight:900;
"
>

ŞİFREYİ SIFIRLA

</a>

</p>

<p style="color:#888">

Bu bağlantı
<b>15 dakika</b>
geçerlidir ve yalnızca bir kez kullanılabilir.

</p>

<p style="color:#666;font-size:12px">

Bu isteği sen yapmadıysan bağlantıyı kullanma.

</p>

</div>

</body>

</html>
`;
}

// --------------------------------------------------
// SEND MAIL
// --------------------------------------------------

async function sendMail(
    to,
    subject,
    html
) {

    if (
        !process.env.GMAIL_USER ||
        !process.env.GMAIL_APP_PASSWORD
    ) {

        throw new Error(
            "Gmail SMTP ayarları eksik."
        );
    }

    await transporter.sendMail({

        from:
            `M53G <${process.env.GMAIL_USER}>`,

        to,

        subject,

        html
    });
}

// --------------------------------------------------
// BODY
// --------------------------------------------------

async function readBody(req) {

    if (
        req.body &&
        typeof req.body === "object"
    ) {

        return req.body;
    }

    return await new Promise(
        (resolve, reject) => {

            let raw = "";

            req.on(
                "data",
                chunk => {

                    raw += chunk;

                    if (
                        raw.length >
                        100000
                    ) {

                        reject(
                            new Error(
                                "Body too large"
                            )
                        );
                    }
                }
            );

            req.on(
                "end",
                () => {

                    try {

                        resolve(
                            raw
                                ? JSON.parse(raw)
                                : {}
                        );

                    } catch {

                        reject(
                            new Error(
                                "Geçersiz JSON"
                            )
                        );
                    }
                }
            );

            req.on(
                "error",
                reject
            );
        }
    );
}

// --------------------------------------------------
// DATABASE
// --------------------------------------------------

async function ensureSchema() {

    await sql`

        CREATE TABLE IF NOT EXISTS profiles (

            id TEXT PRIMARY KEY,

            username TEXT UNIQUE NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password_hash TEXT NOT NULL,

            display_name TEXT NOT NULL,

            xp INTEGER NOT NULL DEFAULT 0,

            coins INTEGER NOT NULL DEFAULT 500,

            downloads INTEGER NOT NULL DEFAULT 0,

            email_verified
                BOOLEAN NOT NULL DEFAULT FALSE,

            verify_token_hash TEXT,

            verify_expires_at
                TIMESTAMPTZ,

            reset_token_hash TEXT,

            reset_expires_at
                TIMESTAMPTZ,

            theme TEXT NOT NULL DEFAULT 'dark',

            daily_claim DATE,

            created_at
                TIMESTAMPTZ NOT NULL DEFAULT NOW()

        )
    `;
}

// --------------------------------------------------
// HANDLER
// --------------------------------------------------

async function handler(
    req,
    res
) {

    try {

        await ensureSchema();

        const url = new URL(
            req.url,
            `https://${req.headers.host || "localhost"}`
        );

        const path =
            url.pathname
                .replace(/^\/api/, "")
                .replace(/\/+$/, "") ||
            "/";

        // --------------------------------------------------
        // HEALTH
        // --------------------------------------------------

        if (
            req.method === "GET" &&
            path === "/health"
        ) {

            return json(
                res,
                200,
                {
                    status: "ok",
                    message:
                        "M53G Backend aktif."
                }
            );
        }

        // --------------------------------------------------
        // ME
        // --------------------------------------------------

        if (
            req.method === "GET" &&
            path === "/auth/me"
        ) {

            const user =
                await currentUser(req);

            return json(
                res,
                200,
                {
                    user
                }
            );
        }

        // --------------------------------------------------
        // REGISTER
        // --------------------------------------------------

        if (
            req.method === "POST" &&
            path === "/auth/register"
        ) {

            const body =
                await readBody(req);

            const username =
                String(
                    body.username || ""
                ).trim();

            const email =
                String(
                    body.email || ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    body.password || ""
                );

            if (
                !/^[A-Za-z0-9_]{3,24}$/
                    .test(username)
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Kullanıcı adı 3-24 karakter olmalı. Sadece harf, rakam ve _ kullan."
                    }
                );
            }

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(email)
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Geçerli bir e-posta gir."
                    }
                );
            }

            if (
                password.length < 8
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Şifre en az 8 karakter olmalı."
                    }
                );
            }

            const existing =
                await sql`

                    SELECT
                        id,
                        email_verified

                    FROM profiles

                    WHERE
                        LOWER(email)
                        =
                        LOWER(${email})

                        OR

                        LOWER(username)
                        =
                        LOWER(${username})

                    LIMIT 1
                `;

            if (existing.length) {

                return json(
                    res,
                    409,
                    {
                        error:
                            "Bu kullanıcı adı veya e-posta zaten kayıtlı."
                    }
                );
            }

            const id =
                crypto.randomUUID();

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );

            const code =
                makeCode();

            await sql`

                INSERT INTO profiles (

                    id,
                    username,
                    email,
                    password_hash,
                    display_name,
                    email_verified,
                    verify_token_hash,
                    verify_expires_at

                )

                VALUES (

                    ${id},
                    ${username},
                    ${email},
                    ${passwordHash},
                    ${username},
                    FALSE,
                    ${hashToken(code)},
                    NOW() + INTERVAL '10 minutes'

                )
            `;

            await sendMail(
                email,
                "M53G — E-posta doğrulama kodun",
                verificationEmail(
                    username,
                    code
                )
            );

            return json(
                res,
                201,
                {
                    ok: true,
                    requiresVerification: true,
                    email
                }
            );
        }

        // --------------------------------------------------
        // VERIFY EMAIL
        // --------------------------------------------------

        if (
            req.method === "POST" &&
            path === "/auth/verify-email"
        ) {

            const body =
                await readBody(req);

            const email =
                String(
                    body.email || ""
                )
                    .trim()
                    .toLowerCase();

            const code =
                String(
                    body.code || ""
                ).trim();

            if (
                !/^\d{6}$/.test(code)
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "6 haneli kodu gir."
                    }
                );
            }

            const rows =
                await sql`

                    SELECT *

                    FROM profiles

                    WHERE
                        LOWER(email)
                        =
                        LOWER(${email})

                    LIMIT 1
                `;

            if (!rows.length) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Doğrulama kodu geçersiz veya süresi dolmuş."
                    }
                );
            }

            const row =
                rows[0];

            if (
                row.email_verified
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Bu hesap zaten doğrulanmış."
                    }
                );
            }

            const expired =
                !row.verify_expires_at ||
                new Date(
                    row.verify_expires_at
                ) < new Date();

            const wrongCode =
                row.verify_token_hash !==
                hashToken(code);

            if (
                expired ||
                wrongCode
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Kod yanlış veya süresi dolmuş."
                    }
                );
            }

            const updated =
                await sql`

                    UPDATE profiles

                    SET

                        email_verified = TRUE,

                        verify_token_hash = NULL,

                        verify_expires_at = NULL

                    WHERE id = ${row.id}

                    RETURNING *
                `;

            const user =
                safeUser(
                    updated[0],
                    updated[0]
                        .email
                        .toLowerCase() ===
                    ADMIN_EMAIL
                );

            cookie(
                res,
                "m53g_session",
                signSession(user),
                {
                    maxAge:
                        60 * 60 * 24 * 7
                }
            );

            return json(
                res,
                200,
                {
                    ok: true,
                    user
                }
            );
        }

        // --------------------------------------------------
        // RESEND CODE
        // --------------------------------------------------

        if (
            req.method === "POST" &&
            path === "/auth/resend-code"
        ) {

            const body =
                await readBody(req);

            const email =
                String(
                    body.email || ""
                )
                    .trim()
                    .toLowerCase();

            const now =
                Date.now();

            const previous =
                resendLimiter.get(
                    email
                ) || 0;

            if (
                now - previous <
                RESEND_COOLDOWN
            ) {

                const seconds =
                    Math.ceil(
                        (
                            RESEND_COOLDOWN -
                            (
                                now -
                                previous
                            )
                        ) / 1000
                    );

                return json(
                    res,
                    429,
                    {
                        error:
                            `Yeni kod için ${seconds} saniye bekle.`
                    }
                );
            }

            const rows =
                await sql`

                    SELECT *

                    FROM profiles

                    WHERE
                        LOWER(email)
                        =
                        LOWER(${email})

                    LIMIT 1
                `;

            if (
                !rows.length ||
                rows[0].email_verified
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Doğrulama bekleyen hesap bulunamadı."
                    }
                );
            }

            const code =
                makeCode();

            await sql`

                UPDATE profiles

                SET

                    verify_token_hash =
                        ${hashToken(code)},

                    verify_expires_at =
                        NOW() +
                        INTERVAL '10 minutes'

                WHERE id =
                    ${rows[0].id}
            `;

            await sendMail(
                email,
                "M53G — Yeni doğrulama kodun",
                verificationEmail(
                    rows[0].username,
                    code
                )
            );

            resendLimiter.set(
                email,
                now
            );

            return json(
                res,
                200,
                {
                    ok: true
                }
            );
        }

        // --------------------------------------------------
        // LOGIN
        // --------------------------------------------------

        if (
            req.method === "POST" &&
            path === "/auth/login"
        ) {

            const body =
                await readBody(req);

            const email =
                String(
                    body.email || ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    body.password || ""
                );

            if (
                !email ||
                !password
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "E-posta ve şifre gerekli."
                    }
                );
            }

            const rows =
                await sql`

                    SELECT *

                    FROM profiles

                    WHERE
                        LOWER(email)
                        =
                        LOWER(${email})

                    LIMIT 1
                `;

            if (!rows.length) {

                return json(
                    res,
                    401,
                    {
                        error:
                            "E-posta veya şifre hatalı."
                    }
                );
            }

            const row =
                rows[0];

            if (
                !row.email_verified
            ) {

                return json(
                    res,
                    403,
                    {
                        error:
                            "Önce e-posta adresini doğrula.",

                        requiresVerification:
                            true,

                        email:
                            row.email
                    }
                );
            }

            let valid = false;

            // Admin hesabı
            if (
                email === ADMIN_EMAIL &&
                ADMIN_PASSWORD &&
                password === ADMIN_PASSWORD
            ) {

                valid = true;

            } else {

                valid =
                    await bcrypt.compare(
                        password,
                        row.password_hash
                    );
            }

            if (!valid) {

                return json(
                    res,
                    401,
                    {
                        error:
                            "E-posta veya şifre hatalı."
                    }
                );
            }

            const user =
                safeUser(
                    row,
                    row.email
                        .toLowerCase() ===
                    ADMIN_EMAIL
                );

            cookie(
                res,
                "m53g_session",
                signSession(user),
                {
                    maxAge:
                        60 * 60 * 24 * 7
                }
            );

            return json(
                res,
                200,
                {
                    ok: true,
                    user
                }
            );
        }

        // --------------------------------------------------
        // LOGOUT
        // --------------------------------------------------

        if (
            req.method === "POST" &&
            path === "/auth/logout"
        ) {

            clearCookie(
                res,
                "m53g_session"
            );

            return json(
                res,
                200,
                {
                    ok: true
                }
            );
        }

        // --------------------------------------------------
        // FORGOT PASSWORD
        // --------------------------------------------------

        if (
            req.method === "POST" &&
            path === "/auth/forgot-password"
        ) {

            const body =
                await readBody(req);

            const email =
                String(
                    body.email || ""
                )
                    .trim()
                    .toLowerCase();

            const rows =
                await sql`

                    SELECT *

                    FROM profiles

                    WHERE
                        LOWER(email)
                        =
                        LOWER(${email})

                    LIMIT 1
                `;

            // E-posta bulunamasa bile aynı cevabı döndür.
            if (!rows.length) {

                return json(
                    res,
                    200,
                    {
                        ok: true
                    }
                );
            }

            const row =
                rows[0];

            const token =
                makeToken();

            await sql`

                UPDATE profiles

                SET

                    reset_token_hash =
                        ${hashToken(token)},

                    reset_expires_at =
                        NOW() +
                        INTERVAL '15 minutes'

                WHERE id =
                    ${row.id}
            `;

            const link =
                `${APP_URL}/?reset=${encodeURIComponent(token)}`;

            await sendMail(
                email,
                "M53G — Şifre sıfırlama bağlantın",
                resetEmail(
                    row.username,
                    link
                )
            );

            return json(
                res,
                200,
                {
                    ok: true
                }
            );
        }

        // --------------------------------------------------
        // RESET PASSWORD
        // --------------------------------------------------

        if (
            req.method === "POST" &&
            path === "/auth/reset-password"
        ) {

            const body =
                await readBody(req);

            const token =
                String(
                    body.token || ""
                );

            const password =
                String(
                    body.password || ""
                );

            if (
                !/^[a-f0-9]{64}$/i
                    .test(token)
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Sıfırlama bağlantısı geçersiz."
                    }
                );
            }

            if (
                password.length < 8
            ) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Şifre en az 8 karakter olmalı."
                    }
                );
            }

            const rows =
                await sql`

                    SELECT *

                    FROM profiles

                    WHERE

                        reset_token_hash =
                            ${hashToken(token)}

                        AND

                        reset_expires_at >
                            NOW()

                    LIMIT 1
                `;

            if (!rows.length) {

                return json(
                    res,
                    400,
                    {
                        error:
                            "Bağlantı geçersiz veya süresi dolmuş."
                    }
                );
            }

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );

            const updated =
                await sql`

                    UPDATE profiles

                    SET

                        password_hash =
                            ${passwordHash},

                        reset_token_hash =
                            NULL,

                        reset_expires_at =
                            NULL

                    WHERE id =
                        ${rows[0].id}

                    RETURNING *
                `;

            const user =
                safeUser(
                    updated[0],
                    updated[0]
                        .email
                        .toLowerCase() ===
                    ADMIN_EMAIL
                );

            cookie(
                res,
                "m53g_session",
                signSession(user),
                {
                    maxAge:
                        60 * 60 * 24 * 7
                }
            );

            return json(
                res,
                200,
                {
                    ok: true,
                    user
                }
            );
        }

        // --------------------------------------------------
        // 404
        // --------------------------------------------------

        return json(
            res,
            404,
            {
                error:
                    "API rotası bulunamadı."
            }
        );

    } catch (error) {

        console.error(
            "M53G API ERROR:",
            error
        );

        return json(
            res,
            500,
            {
                error:
                    "Sunucu hatası. Vercel loglarını kontrol et."
            }
        );
    }
}

module.exports = handler;
