const {sql,ensureSchema}=require('./_lib');
module.exports=async(req,res)=>{
  await ensureSchema();
  const rows=await sql()`SELECT username,display_name,xp,coins FROM profiles ORDER BY xp DESC LIMIT 50`;
  res.json({users:rows.map(u=>({username:u.username,displayName:u.display_name,xp:Number(u.xp||0),coins:Number(u.coins||0)}))});
};
