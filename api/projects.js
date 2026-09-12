const {sql,ensureSchema}=require('./_lib');
module.exports=async(req,res)=>{
  await ensureSchema();
  const projects=await sql()`SELECT id,name,description,category,engine,version,rating,downloads,file,created_at FROM projects ORDER BY created_at DESC`;
  const stats=await sql()`SELECT COALESCE(SUM(downloads),0)::int AS downloads FROM projects`;
  const users=await sql()`SELECT COUNT(*)::int AS users FROM profiles`;
  res.json({projects:projects.map(p=>({id:p.id,name:p.name,desc:p.description,category:p.category,engine:p.engine,version:p.version,rating:Number(p.rating||5),downloads:Number(p.downloads||0),file:p.file})),stats:{downloads:Number(stats[0]?.downloads||0),users:Number(users[0]?.users||0)}});
};
