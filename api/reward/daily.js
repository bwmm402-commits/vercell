const {sql,ensureSchema,getUser,safeUser}=require('../../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const user=await getUser(req);
  if(!user) return res.status(401).json({error:'Giriş yapmalısın.'});
  const rows=await sql()`UPDATE profiles SET xp=xp+50,coins=coins+100,daily_claim=CURRENT_DATE WHERE id=${user.id} AND (daily_claim IS NULL OR daily_claim<CURRENT_DATE) RETURNING *`;
  if(!rows.length) return res.status(400).json({error:'Bugünkü ödülü zaten aldın.'});
  res.json({user:safeUser(rows[0]),message:'+100 Coin +50 XP 🎁'});
};
