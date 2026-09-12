const {sql,hashToken,ensureSchema,setSession}=require('../_lib');
module.exports=async(req,res)=>{
  await ensureSchema();
  const token=String(req.query?.token||'');
  if(!token) return res.status(400).send('Geçersiz bağlantı.');
  const rows=await sql()`UPDATE profiles SET email_verified=TRUE, verify_token_hash=NULL, verify_expires_at=NULL WHERE verify_token_hash=${hashToken(token)} AND verify_expires_at>NOW() RETURNING id`;
  if(!rows.length) return res.status(400).send('<h1>M53G</h1><p>Bağlantı geçersiz veya süresi dolmuş.</p>');
  setSession(res,rows[0].id);
  res.send('<html><body style="font-family:Arial;background:#050505;color:white;display:grid;place-items:center;min-height:100vh"><div style="text-align:center"><h1>✅ E-posta doğrulandı</h1><a href="/" style="color:white">M53G\'ye dön</a></div></body></html>');
};
