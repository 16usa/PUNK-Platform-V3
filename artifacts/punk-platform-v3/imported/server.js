import express from 'express';
const app=express();
app.disable('x-powered-by');
app.use(express.static('public'));
app.get('/health',(_,res)=>res.json({ok:true,version:'3.0',mode:'demo'}));
const port=Number(process.env.PORT)||3000;
app.listen(port,'0.0.0.0',()=>console.log('PUNK V3 listening on '+port));
