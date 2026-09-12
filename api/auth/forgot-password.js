const {sql,ensureSchema,sendReset}=require('../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const email=String(req.body?.email||'').trim().toLowerCase();
  const rows=await sql()`SELECT * FROM profiles WHERE LOWER(email)=LOWER(${email}) LIMIT 1`;
  if(rows[0]) { try{ await sendReset(rows[0]); }catch(e){ console.error(e); } }
  res.json({ok:true});
};
