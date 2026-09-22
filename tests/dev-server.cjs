// Local-only UI test server. Replaces auth/cloud with an in-memory fake; never deployed.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mock=`const testRows = JSON.parse(sessionStorage.getItem('test-cloud') || '{}');
let testUser = JSON.parse(sessionStorage.getItem('test-user') || 'null'), testListener;
window.supabaseClient = {
 auth: {
  getSession: async () => ({data:{session:testUser ? {user:testUser} : null}}),
  onAuthStateChange(fn){testListener=fn;},
  signInWithPassword:async ({email})=>{testUser={id:email,email,user_metadata:{}};sessionStorage.setItem('test-user',JSON.stringify(testUser));testListener?.('SIGNED_IN',{user:testUser});return {data:{user:testUser,session:{user:testUser}}};},
  signOut:async()=>{testUser=null;sessionStorage.removeItem('test-user');testListener?.('SIGNED_OUT',null);return {};}
 },
 from(table){return {select(){return this;},eq(key,id){this.id=id;return this;},async maybeSingle(){return {data:table==='profiles'?{role:'teacher',student_id:null}:testRows[this.id]||null};},async upsert(row){testRows[row.user_id]=row;sessionStorage.setItem('test-cloud',JSON.stringify(testRows));return {};}};}
};`;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/test-auth.js'){res.setHeader('Content-Type','text/javascript');res.end(mock);return;}
 const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!target.startsWith(root+path.sep)||target.includes('.git')||target.includes('private-backup')){res.writeHead(403).end();return;}
 try{
 let data=fs.readFileSync(target);
 const ext=path.extname(target);
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.pdf':'application/pdf'})[ext]||'application/octet-stream');
 if(ext==='.html')data=data.toString().replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase\/supabase-js@2"><\/script>/,'<script src="/test-auth.js"></script>').replace(/<script src="js\/supabase.js[^\"]*"><\/script>/,'').replace("if ('serviceWorker' in navigator)",'if (false)');
 res.end(data);
 }catch{res.writeHead(404).end();}
}).listen(8765,'127.0.0.1',()=>console.log('Local test preview: http://127.0.0.1:8765'));
