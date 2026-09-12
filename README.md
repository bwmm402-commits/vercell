# M53G V8 — Vercel Backend

Bu proje Supabase kullanmaz.

## Stack
- Vercel Functions
- Neon PostgreSQL
- Node.js 24
- Nodemailer + Gmail SMTP
- JWT + HttpOnly session cookie
- bcryptjs ile şifre hashleme

## Admin
Varsayılan ortam değişkenleri:
- ADMIN_EMAIL=
- ADMIN_PASSWORD=

Üretimde ADMIN_PASSWORD'u güçlü bir değere değiştirmen önerilir.

## 1) Neon
Bir Neon PostgreSQL database oluştur ve `DATABASE_URL` değerini al. `schema.sql` dosyasını çalıştır.

## 2) Gmail
Gmail hesabında 2-Step Verification aç. Ardından App Password oluştur ve bunu `GMAIL_APP_PASSWORD` olarak Vercel'e ekle. Normal Gmail şifresini kullanma.

## 3) Vercel Environment Variables
- DATABASE_URL
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD
- GMAIL_USER
- GMAIL_APP_PASSWORD
- APP_URL (ör. https://m53g-xyz.vercel.app)
- NODE_ENV=production

## 4) Deploy
Klasörü GitHub repository'ye koy, Vercel'de Import Project de ve Deploy et.

`public/index.html` site olarak açılır. `/api/*` endpointleri Vercel Functions olarak çalışır.
