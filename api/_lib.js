const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { neon } = require('@neondatabase/serverless');

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'm53g@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'm53g2026');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_VERCEL';
const APP_URL = String(process.env.APP_URL || '').replace(/\/$/, '');
const COOKIE_NAME = 'm53g_session';

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL eksik.');
  return neon(process.env.DATABASE_URL);
}

function uid(){ return crypto.randomUUID(); }
function token(){ return crypto.randomBytes(32).toString('hex'); }
function hashToken(t){ return crypto.createHash('sha256').update(t).digest('hex'); }
function sign(id){ return jwt.sign({sub:id}, JWT_SECRET, {expiresIn:'30d'}); }

function setSession(res, id){
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(sign(id))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
}
function clearSession(res){
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}
function getCookie(req){
  const raw = String(req.headers.cookie || '');
  const part = raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE_NAME+'='));
  return part ? decodeURIComponent(part.slice(COOKIE_NAME.length+1)) : null;
}

async function getUser(req){
  const t = getCookie(req);
  if (!t) return null;
  try {
    const payload = jwt.verify(t, JWT_SECRET);
    const rows = await sql()`SELECT * FROM profiles WHERE id=${payload.sub} LIMIT 1`;
    return rows[0] || null;
  } catch { return null; }
}

function safeUser(row){
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    xp: Number(row.xp || 0),
    coins: Number(row.coins || 0),
    downloads: Number(row.downloads || 0),
    verified: Boolean(row.email_verified),
    theme: row.theme || 'dark',
    admin: String(row.email).toLowerCase() === ADMIN_EMAIL
  };
}

async function ensureSchema(){
  const q = sql;
  await q`CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 500,
    downloads INTEGER NOT NULL DEFAULT 0,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verify_token_hash TEXT,
    verify_expires_at TIMESTAMPTZ,
    reset_token_hash TEXT,
    reset_expires_at TIMESTAMPTZ,
    theme TEXT NOT NULL DEFAULT 'dark',
    daily_claim DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    engine TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    rating NUMERIC(3,2) NOT NULL DEFAULT 5,
    downloads INTEGER NOT NULL DEFAULT 0,
    file TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE TABLE IF NOT EXISTS poll (
    id INTEGER PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    voters JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`CREATE TABLE IF NOT EXISTS announcement (
    id INTEGER PRIMARY KEY,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await q`INSERT INTO projects(id,name,description,category,engine,version,rating,file)
    VALUES ('p1','Kedi Sürüş Oyunu','M53G için hazırlanan eğlenceli araba sürüş oyunu.','game','HTML5','1.0',4.8,'downloads/kedi_surus_oyunu.zip'),
           ('p2','M53G Tycoon','Tesislerini geliştir, gelirini büyüt ve yeni alanlar aç.','simulation','HTML5','1.0',4.7,'downloads/m53g_tycoon.zip'),
           ('p3','M53G Arena','Yerel iki kişilik hızlı arena aksiyon oyunu.','game','HTML5','1.0',4.9,'downloads/m53g_arena.zip')
    ON CONFLICT(id) DO NOTHING`;
  await q`INSERT INTO poll(id,question,options,voters)
    VALUES (1,'Sıradaki M53G projesi ne olsun?', '[{"text":"3D Racing","votes":0},{"text":"Korku Oyunu","votes":0},{"text":"2D Platformer","votes":0}]'::jsonb, '{}'::jsonb)
    ON CONFLICT(id) DO NOTHING`;
  await q`INSERT INTO announcement(id,text,author)
    VALUES (1,'M53G platformuna hoş geldin.','M53G Admin')
    ON CONFLICT(id) DO NOTHING`;
  const existing = await q`SELECT id FROM profiles WHERE LOWER(email)=LOWER(${ADMIN_EMAIL}) LIMIT 1`;
  if (!existing.length) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await q`INSERT INTO profiles(id,username,email,password_hash,display_name,email_verified)
      VALUES(${uid()},'m53g_admin',${ADMIN_EMAIL},${hash},'M53G Admin',TRUE)`;
  }
}

function mailer(){
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service:'gmail',
    auth:{user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD}
  });
}

async function sendEmail(to, subject, html){
  const t = mailer();
  if (!t) {
    console.log(`[M53G DEV MAIL] ${to} | ${subject}\n${html}`);
    return false;
  }
  await t.sendMail({
    from:`M53G <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html
  });
  return true;
}

function mailTemplate(title, text, button, url){
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#050505;color:#fff;font-family:Arial;padding:30px"><div style="max-width:600px;margin:auto;background:#0e0e14;border:1px solid #2a2a33;border-radius:16px;padding:28px"><h1 style="margin-top:0">M53G</h1><h2>${title}</h2><p style="color:#aaa;line-height:1.6">${text}</p><a href="${url}" style="display:inline-block;padding:13px 18px;background:#fff;color:#000;border-radius:9px;text-decoration:none;font-weight:800">${button}</a><p style="color:#666;margin-top:25px">M53G Studio</p></div></body></html>`;
}

async function sendVerification(user){
  const t = token();
  await sql()`UPDATE profiles SET verify_token_hash=${hashToken(t)}, verify_expires_at=NOW()+INTERVAL '24 hours' WHERE id=${user.id}`;
  const url = `${APP_URL}/api/auth/verify?token=${encodeURIComponent(t)}`;
  return sendEmail(user.email,'M53G — E-posta doğrulama',mailTemplate('E-posta Doğrulama','M53G hesabını aktifleştirmek için düğmeye bas.','E-POSTAMI DOĞRULA',url));
}

async function sendReset(user){
  const t = token();
  await sql()`UPDATE profiles SET reset_token_hash=${hashToken(t)}, reset_expires_at=NOW()+INTERVAL '1 hour' WHERE id=${user.id}`;
  const url = `${APP_URL}/?reset=${encodeURIComponent(t)}`;
  return sendEmail(user.email,'M53G — Şifre sıfırlama',mailTemplate('Şifre Sıfırlama','Yeni şifreni oluşturmak için aşağıdaki düğmeyi kullan.','ŞİFREMİ YENİLE',url));
}

module.exports={
  sql,uid,bcrypt,hashToken,ensureSchema,safeUser,getUser,setSession,clearSession,sendVerification,sendReset,ADMIN_EMAIL,ADMIN_PASSWORD
};
