const {sql,ensureSchema,getUser,safeUser}=require('./_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const user=await getUser(req);
  if(!user) return res.status(401).json({error:'Giriş yapmalısın.'});
  const displayName=String(req.body?.displayName||'').trim();
  const theme=String(req.body?.theme||'dark');
  if(displayName.length<2||displayName.length>40) return res.status(400).json({error:'İsim 2-40 karakter olmalı.'});
  if(!['dark','cyber','matrix'].includes(theme)) return res.status(400).json({error:'Geçersiz tema.'});
  const rows=await sql()`UPDATE profiles SET display_name=${displayName},theme=${theme} WHERE id=${user.id} RETURNING *`;
  res.json({user:safeUser(rows[0])});
};
