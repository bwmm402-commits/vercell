const {sql,bcrypt,hashToken,ensureSchema,safeUser,setSession}=require('../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const token=String(req.body?.token||'');
  const password=String(req.body?.password||'');
  if(!token||password.length<8) return res.status(400).json({error:'Geçersiz bilgiler.'});
  const hash=await bcrypt.hash(password,12);
  const rows=await sql()`UPDATE profiles SET password_hash=${hash}, reset_token_hash=NULL, reset_expires_at=NULL WHERE reset_token_hash=${hashToken(token)} AND reset_expires_at>NOW() RETURNING *`;
  if(!rows.length) return res.status(400).json({error:'Bağlantı geçersiz veya süresi dolmuş.'});
  setSession(res,rows[0].id);
  res.json({user:safeUser(rows[0])});
};
