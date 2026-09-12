const {ensureSchema,getUser,safeUser}=require('../_lib');
module.exports=async(req,res)=>{
  await ensureSchema();
  const user=await getUser(req);
  res.json({user:safeUser(user)});
};
