const {sql,ensureSchema,getUser,safeUser}=require('../../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const id=String(req.query?.id||'');
  const user=await getUser(req);
  const project=await sql()`UPDATE projects SET downloads=downloads+1 WHERE id=${id} RETURNING id`;
  if(!project.length) return res.status(404).json({error:'Proje bulunamadı.'});
  let updated=null;
  if(user){
    const rows=await sql()`UPDATE profiles SET downloads=downloads+1,xp=xp+20,coins=coins+10 WHERE id=${user.id} RETURNING *`;
    updated=rows[0]||null;
  }
  const stats=await sql()`SELECT COALESCE(SUM(downloads),0)::int AS downloads FROM projects`;
  res.json({user:safeUser(updated),stats:{downloads:Number(stats[0]?.downloads||0)}});
};
