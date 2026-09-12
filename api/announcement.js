const {sql,ensureSchema}=require('./_lib');
module.exports=async(req,res)=>{
  await ensureSchema();
  const rows=await sql()`SELECT text,author,created_at FROM announcement WHERE id=1 LIMIT 1`;
  const a=rows[0]||{text:'M53G topluluğuna hoş geldin.',author:'M53G Admin',created_at:new Date().toISOString()};
  res.json({announcement:{text:a.text,author:a.author,createdAt:a.created_at}});
};
