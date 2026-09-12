const {sql,uid,bcrypt,ensureSchema,safeUser,setSession,sendVerification,ADMIN_EMAIL}=require('../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    await ensureSchema();
    const username=String(req.body?.username||'').trim();
    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    if(!/^[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ-]{3,24}$/.test(username)) return res.status(400).json({error:'Kullanıcı adı 3-24 karakter olmalı.'});
    if(!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({error:'Geçerli bir e-posta gir.'});
    if(password.length<8) return res.status(400).json({error:'Şifre en az 8 karakter olmalı.'});
    if(email===ADMIN_EMAIL) return res.status(400).json({error:'Bu e-posta admin hesabına ait.'});
    const exists=await sql()`SELECT id FROM profiles WHERE LOWER(email)=LOWER(${email}) OR LOWER(username)=LOWER(${username}) LIMIT 1`;
    if(exists.length) return res.status(409).json({error:'Kullanıcı adı veya e-posta zaten kayıtlı.'});
    const hash=await bcrypt.hash(password,12);
    const rows=await sql()`INSERT INTO profiles(id,username,email,password_hash,display_name) VALUES(${uid()},${username},${email},${hash},${username}) RETURNING *`;
    const user=rows[0];
    setSession(res,user.id);
    await sendVerification(user);
    return res.status(201).json({user:safeUser(user)});
  }catch(e){ console.error(e); return res.status(500).json({error:'Kayıt sırasında hata oluştu.'}); }
};
