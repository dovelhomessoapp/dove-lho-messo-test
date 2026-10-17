const baseUrl='https://ephdnunjudbwlgbxdadm.supabase.co';
const publicKey='sb_publishable_3kcIRxESMdgXMEwvFs3_0A_0JZkJqZT';
const byId=id=>document.getElementById(id);
const statusText=text=>byId('status').textContent=text;
let activeToken=null;
byId('login').onsubmit=async(event)=>{
 event.preventDefault();
 const submit=byId('enter');submit.disabled=true;
 try{
   statusText('Verifica in corso...');
   const response=await fetch(baseUrl+'/auth/v1/token?grant_type=password',{
     method:'POST',
     headers:{'apikey':publicKey,'Content-Type':'application/json'},
     body:JSON.stringify({email:byId('email').value,password:byId('password').value})
   });
   const user=await response.json();
   byId('password').value='';
   if(!response.ok)throw Error(user.msg||user.error_description||user.message||'Login non riuscito');
   activeToken=user.access_token;
   const records=await fetch(baseUrl+'/rest/v1/homes?select=name',{headers:{'apikey':publicKey,'Authorization':'Bearer '+activeToken}});
   const houses=await records.json();
   if(!records.ok)throw Error(houses.message||'Non riesco a leggere le case');
   byId('who').textContent='Account: '+(user.user?.email||'autenticato');
   byId('houses').replaceChildren();
   for(const house of houses){const li=document.createElement('li');li.textContent=house.name;byId('houses').append(li);}
   byId('login').hidden=true;byId('account').hidden=false;
   statusText('Verifica riuscita. Case visibili: '+houses.length);
 }catch(error){statusText(error.message)}finally{submit.disabled=false}
};
byId('exit').onclick=()=>{activeToken=null;byId('account').hidden=true;byId('login').hidden=false;statusText('Disconnesso');};
