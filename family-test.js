const baseUrl='https://ephdnunjudbwlgbxdadm.supabase.co';
const publicKey='sb_publishable_3kcIRxESMdgXMEwvFs3_0A_0JZkJqZT';
const byId=id=>document.getElementById(id);
const statusText=text=>byId('status').textContent=text;
let activeToken=null,selectedHome=null,activeUser=null;
const authHeaders=()=>({'apikey':publicKey,'Authorization':'Bearer '+activeToken,'Content-Type':'application/json'});
async function loadItems(){const response=await fetch(baseUrl+'/rest/v1/items?select=id,title,kind&home_id=eq.'+encodeURIComponent(selectedHome)+'&order=created_at.desc',{headers:authHeaders()});const rows=await response.json();if(!response.ok)throw Error(rows.message||'Errore nel caricamento oggetti');byId('cloudItems').replaceChildren();for(const x of rows){const li=document.createElement('li');li.textContent=x.title+(x.kind==='book'?' (libro)':'');byId('cloudItems').append(li)}statusText('Oggetti visibili: '+rows.length)}

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
   activeToken=user.access_token;activeUser=user.user?.id||null;
   const records=await fetch(baseUrl+'/rest/v1/homes?select=id,name',{headers:{'apikey':publicKey,'Authorization':'Bearer '+activeToken}});
   const houses=await records.json();
   if(!records.ok)throw Error(houses.message||'Non riesco a leggere le case');
   byId('who').textContent='Account: '+(user.user?.email||'autenticato');
   byId('houses').replaceChildren();
   for(const house of houses){const li=document.createElement('li');li.textContent=house.name;byId('houses').append(li);}
   byId('login').hidden=true;byId('account').hidden=false;
   selectedHome=houses.length===1?houses[0].id:null;byId('inventoryTest').hidden=!selectedHome;if(selectedHome)await loadItems();else statusText('Seleziona una casa (test disponibile con una sola casa).');
 }catch(error){statusText(error.message)}finally{submit.disabled=false}
};
byId('itemTestForm').onsubmit=async e=>{e.preventDefault();if(!selectedHome||!activeToken)return;const btn=byId('saveTestItem');btn.disabled=true;try{const name=byId('testItemName').value.trim();if(!name)return;const result=await fetch(baseUrl+'/rest/v1/items',{method:'POST',headers:{...authHeaders(),'Prefer':'return=representation'},body:JSON.stringify({home_id:selectedHome,title:name,kind:'object',created_by:activeUser})});const body=await result.json().catch(()=>null);if(!result.ok)throw Error(body?.message||'Errore salvataggio');byId('testItemName').value='';await loadItems();statusText('Oggetto salvato nella Casa di famiglia!')}catch(err){statusText('Salvataggio non riuscito: '+err.message)}finally{btn.disabled=false}};
byId('exit').onclick=()=>{activeToken=null;selectedHome=null;activeUser=null;byId('inventoryTest').hidden=true;byId('account').hidden=true;byId('login').hidden=false;statusText('Disconnesso');};
