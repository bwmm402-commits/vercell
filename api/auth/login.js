const {sql,bcrypt,ensureSchema,safeUser,setSession}=require('../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    await ensureSchema();
    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    const rows=await sql()`SELECT * FROM profiles WHERE LOWER(email)=LOWER(${email}) LIMIT 1`;
    const user=rows[0];
    if(!user) return res.status(401).json({error:'E-posta veya şifre hatalı.'});
    const ok=await bcrypt.compare(password,user.password_hash);
    if(!ok) return res.status(401).json({error:'E-posta veya şifre hatalı.'});
    setSession(res,user.id);
    return res.json({user:safeUser(user)});
  }catch(e){ console.error(e); return res.status(500).json({error:'Giriş sırasında hata oluştu.'}); }
};
