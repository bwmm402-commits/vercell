const {sql,ensureSchema,getUser}=require('./_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const user=await getUser(req);
  if(!user) return res.status(401).json({error:'Giriş yapmalısın.'});
  const index=Number(req.body?.option);
  const rows=await sql()`SELECT question,options,voters FROM poll WHERE id=1 LIMIT 1`;
  if(!rows.length) return res.status(404).json({error:'Anket bulunamadı.'});
  const p=rows[0];
  const voters=p.voters||{};
  if(voters[user.id]) return res.status(400).json({error:'Bu ankette zaten oy kullandın.'});
  const options=Array.isArray(p.options)?p.options:[];
  if(!Number.isInteger(index)||!options[index]) return res.status(400).json({error:'Geçersiz seçenek.'});
  options[index].votes=Number(options[index].votes||0)+1;
  voters[user.id]=true;
  const updated=await sql()`UPDATE poll SET options=${JSON.stringify(options)}::jsonb,voters=${JSON.stringify(voters)}::jsonb,updated_at=NOW() WHERE id=1 RETURNING question,options`;
  res.json({poll:updated[0]});
};
