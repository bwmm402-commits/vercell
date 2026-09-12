const {sql,ensureSchema}=require('./_lib');
module.exports=async(req,res)=>{
  await ensureSchema();
  const row=(await sql()`SELECT question,options FROM poll WHERE id=1 LIMIT 1`)[0];
  res.json({poll:row||{question:'Henüz anket yok.',options:[]}});
};
