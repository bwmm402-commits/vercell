const {ensureSchema,getUser,sendVerification}=require('../_lib');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  await ensureSchema();
  const user=await getUser(req);
  if(!user) return res.status(401).json({error:'Giriş yapmalısın.'});
  if(user.email_verified) return res.status(400).json({error:'E-posta zaten doğrulandı.'});
  await sendVerification(user);
  res.json({ok:true});
};
