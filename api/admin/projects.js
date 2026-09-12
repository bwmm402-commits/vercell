const {sql,ensureSchema,getUser,ADMIN_EMAIL,uid}=require('../_lib');
function isAdmin(user){return user&&String(user.email).toLowerCase()===ADMIN_EMAIL;}
module.exports=async(req,res)=>{
  await ensureSchema();
  const user=await getUser(req);
  if(!isAdmin(user)) return res.status(403).json({error:'Admin yetkisi gerekiyor.'});
  if(req.method==='POST'){
    const name=String(req.body?.name||'').trim();
    const description=String(req.body?.description||'').trim();
    const category=String(req.body?.category||'game');
    const engine=String(req.body?.engine||'HTML5').trim();
    const version=String(req.body?.version||'1.0').trim();
    const rating=Number(req.body?.rating??5);
    const file=String(req.body?.file||'').trim()||null;
    if(!name||!description||!engine) return res.status(400).json({error:'Ad, açıklama ve motor gerekli.'});
    if(!['game','simulation','software'].includes(category)) return res.status(400).json({error:'Geçersiz kategori.'});
    if(!Number.isFinite(rating)||rating<0||rating>5) return res.status(400).json({error:'Puan 0-5 arasında olmalı.'});
    const rows=await sql()`INSERT INTO projects(id,name,description,category,engine,version,rating,file) VALUES(${uid()},${name},${description},${category},${engine},${version},${rating},${file}) RETURNING *`;
    return res.status(201).json({project:rows[0]});
  }
  if(req.method==='DELETE'){
    const id=String(req.query?.id||'');
    if(!id) return res.status(400).json({error:'Proje ID gerekli.'});
    const rows=await sql()`DELETE FROM projects WHERE id=${id} RETURNING id`;
    if(!rows.length) return res.status(404).json({error:'Proje bulunamadı.'});
    return res.json({ok:true});
  }
  return res.status(405).json({error:'Method not allowed'});
};
