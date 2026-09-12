const {sql,ensureSchema,getUser,ADMIN_EMAIL}=require('../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const user=await getUser(req);
  if(!user||String(user.email).toLowerCase()!==ADMIN_EMAIL) return res.status(403).json({error:'Admin yetkisi gerekiyor.'});
  const text=String(req.body?.text||'').trim();
  if(!text) return res.status(400).json({error:'Mesaj boş olamaz.'});
  const rows=await sql()`UPDATE announcement SET text=${text},author=${user.display_name},created_at=NOW() WHERE id=1 RETURNING *`;
  res.json({announcement:{text:rows[0].text,author:rows[0].author,createdAt:rows[0].created_at}});
};
