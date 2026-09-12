CREATE TABLE IF NOT EXISTS profiles (
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
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('game','simulation','software')),
  engine TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  downloads INTEGER NOT NULL DEFAULT 0,
  file TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  voters JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO projects(id,name,description,category,engine,version,rating,file)
VALUES
('p1','Kedi Sürüş Oyunu','M53G için hazırlanan eğlenceli araba sürüş oyunu.','game','HTML5','1.0',4.8,'downloads/kedi_surus_oyunu.zip'),
('p2','M53G Tycoon','Tesislerini geliştir, gelirini büyüt ve yeni alanlar aç.','simulation','HTML5','1.0',4.7,'downloads/m53g_tycoon.zip'),
('p3','M53G Arena','Yerel iki kişilik hızlı arena aksiyon oyunu.','game','HTML5','1.0',4.9,'downloads/m53g_arena.zip')
ON CONFLICT(id) DO NOTHING;

INSERT INTO poll(id,question,options,voters)
VALUES(1,'Sıradaki M53G projesi ne olsun?','[{"text":"3D Racing","votes":0},{"text":"Korku Oyunu","votes":0},{"text":"2D Platformer","votes":0}]','{}')
ON CONFLICT(id) DO NOTHING;

INSERT INTO announcement(id,text,author)
VALUES(1,'M53G platformuna hoş geldin.','M53G Admin')
ON CONFLICT(id) DO NOTHING;
