const {sql,ensureSchema,getUser,ADMIN_EMAIL}=require('../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const user=await getUser(req);
  if(!user||String(user.email).toLowerCase()!==ADMIN_EMAIL) return res.status(403).json({error:'Admin yetkisi gerekiyor.'});
  const question=String(req.body?.question||'').trim();
  const options=Array.isArray(req.body?.options)?req.body.options.map(x=>String(x).trim()).filter(Boolean).slice(0,8):[];
  if(!question||options.length<2) return res.status(400).json({error:'Soru ve en az 2 seçenek gerekli.'});
  const data=options.map(text=>({text,votes:0}));
  const rows=await sql()`UPDATE poll SET question=${question},options=${JSON.stringify(data)}::jsonb,voters='{}'::jsonb,updated_at=NOW() WHERE id=1 RETURNING question,options`;
  res.json({poll:rows[0]});
};
