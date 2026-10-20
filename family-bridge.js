/* Versione famiglia in prova: sincronizzazione controllata. */
(()=>{
const base='https://ephdnunjudbwlgbxdadm.supabase.co';
const key='sb_publishable_3kcIRxESMdgXMEwvFs3_0A_0JZkJqZT';
const home=document.getElementById('home');
const panel=document.createElement('section');panel.className='panel';
panel.innerHTML='<h3>🏡 Casa di famiglia</h3><form id="familyForm"><label>Email<input type="email" id="familyEmail" required autocomplete="email"></label><label>Password<input type="password" id="familyPass" required autocomplete="current-password"></label><button class="primary">Accedi</button></form><details id="familySignupBox"><summary>Crea un accesso personale</summary><form id="familySignup"><label>Email personale<input id="signupEmail" type="email" autocomplete="email" required></label><label>Nuova password<input id="signupPass" type="password" autocomplete="new-password" minlength="8" required></label><button type="submit" class="secondary">Crea account</button></form><p class="hint">Per entrare nella Casa di famiglia servirà anche un invito del proprietario.</p></details><section id="familyOnline" hidden><p id="familyHouse"></p><p id="familyCount"></p><button type="button" class="secondary" id="familyReload">Aggiorna inventario</button><button type="button" class="secondary" id="familyRename">Rinomina oggetto di prova</button><button type="button" class="secondary" id="familyExit">Esci</button></section><p class="hint" id="familyMsg" role="status">Gli oggetti online compariranno nella sezione Oggetti dopo l’accesso.</p>';
home.append(panel);
const el=id=>document.getElementById(id);
let token=null,house=null,sending=false;
let refreshToken=null;
const SESSION_KEY='dlm-test-family-refresh-v1';
const cloudIds=new Set();
const cloudPlaceIds=new Set();
const pendingPhotos=new Set();
const EDIT_KEY='dlm-test-offline-edits-v1';
const pendingEdits=new Map(Object.entries(JSON.parse(localStorage.getItem(EDIT_KEY)||'{}')));
const saveEdits=()=>localStorage.setItem(EDIT_KEY,JSON.stringify(Object.fromEntries(pendingEdits)));
const deletingIds=new Set();
const CREATE_KEY='dlm-test-pending-creates-v1';
const pendingCreates=new Set(JSON.parse(localStorage.getItem(CREATE_KEY)||'[]'));
const saveCreates=()=>localStorage.setItem(CREATE_KEY,JSON.stringify([...pendingCreates]));
const seenIds=new Set(JSON.parse(localStorage.getItem('dlm-test-seen-v1')||'[]'));
const saveSeen=()=>localStorage.setItem('dlm-test-seen-v1',JSON.stringify([...seenIds]));
async function uploadPhoto(item){
 const path=house.id+'/'+item.id+'-'+crypto.randomUUID()+'.jpg';
 const binary=await (await fetch(item.photo)).blob();
 const response=await familyFetch(base+'/storage/v1/object/foto-oggetti/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'image/jpeg'},body:binary});
 if(!response.ok)throw Error((await response.json().catch(()=>({}))).message||'Upload non riuscito');
 return path;
}
async function signPhoto(path){
 const response=await familyFetch(base+'/storage/v1/object/sign/foto-oggetti/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
 const data=await response.json();
 if(!response.ok||!data.signedURL)throw Error(data.message||'Foto non disponibile');
 return base+'/storage/v1'+data.signedURL;
}
const PHOTO_CACHE='dlm-test-photo-cache-v33';
async function cacheFamilyPhoto(id,url){
 if(!('caches' in window)||!url||!url.startsWith('https://'))return;
 try{
  const response=await fetch(url);
  if(!response.ok)return;
  const cache=await caches.open(PHOTO_CACHE);
  await cache.put('offline-photo-'+id,response);
 }catch(e){}
}
async function restoreFamilyPhotos(){
 if(!('caches' in window))return;
 try{
  const cache=await caches.open(PHOTO_CACHE);
  for(const item of db.items){
   if(!item.photo||!item.photo.startsWith('https://'))continue;
   const hit=await cache.match('offline-photo-'+item.id);
   if(!hit)continue;
   const blob=await hit.blob();
   const reader=new FileReader();
   const data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
   item.photo=data;
  }
  renderItems();
 }catch(e){}
}
void restoreFamilyPhotos();
const notice=s=>el('familyMsg').textContent=s;
async function renew(){
 if(!refreshToken)throw Error('Sessione scaduta');
 const r=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});
 const d=await r.json();if(!r.ok)throw Error(d.msg||d.message||'Accesso scaduto');
 token=d.access_token;refreshToken=d.refresh_token;
 localStorage.setItem(SESSION_KEY,refreshToken);
 return token;
}
let renewalPromise=null;
function needsRenewal(){
 try{const p=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return Date.now()>=(p.exp-90)*1000}catch{return true}
}
async function refreshOnce(){
 if(!renewalPromise)renewalPromise=renew().finally(()=>{renewalPromise=null});
 return renewalPromise;
}
async function familyFetch(url,options={}){
 const isFamily=!!token&&!!refreshToken;
 if(isFamily&&needsRenewal())await refreshOnce();
 const headers={...options.headers};
 if(isFamily)headers.Authorization='Bearer '+token;
 let response=await fetch(url,{...options,headers});
 if(response.status===401&&isFamily){
  await refreshOnce();
  headers.Authorization='Bearer '+token;
  response=await fetch(url,{...options,headers});
 }
 return response;
}
async function get(path,t){const r=await familyFetch(base+path,{headers:{apikey:key,Authorization:'Bearer '+t},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.message||'Errore di lettura');return d}
async function load(){
 const objects=await get('/rest/v1/items?select=id,kind,title,author,isbn,description,image_url,location_id,estimated_value,created_at&home_id=eq.'+house.id,token);
 const places=await get('/rest/v1/locations?select=id,name&home_id=eq.'+house.id,token);
 for(const i of objects){if(i.image_url&&i.image_url.startsWith(house.id+'/')){try{i.image_url=await signPhoto(i.image_url)}catch(e){i.image_url='';notice('Foto non disponibile')}}}
 // Aggiorna solo la copia locale usata dalle schermate dell'app di prova.
 cloudIds.clear();objects.forEach(i=>{cloudIds.add(i.id);seenIds.add(i.id);if(pendingCreates.delete(i.id))saveCreates()});saveSeen();
 places.forEach(p=>cloudPlaceIds.add(p.id));
 const pending=db.items.filter(i=>(pendingCreates.has(i.id)&&!seenIds.has(i.id))||pendingPhotos.has(i.id)||pendingEdits.has(i.id));
 db.items=[...objects.filter(i=>!pendingPhotos.has(i.id)&&!pendingEdits.has(i.id)).map(i=>({id:i.id,kind:i.kind,name:i.title,author:i.author||'',barcode:i.isbn||'',desc:i.description||'',photo:i.image_url||'',place:i.location_id||'',value:i.estimated_value??'',created:Date.parse(i.created_at)||Date.now()})),...pending];
 db.places=[...places.map(p=>({id:p.id,name:p.name})),...db.places.filter(p=>!places.some(c=>c.id===p.id))];
 localStorage.setItem('dlm-test-v1',JSON.stringify(db));
 renderStats();renderPlaces();renderItems();
 for(const item of db.items)if(item.photo&&item.photo.startsWith('https://'))void cacheFamilyPhoto(item.id,item.photo);
 void restoreFamilyPhotos();
 el('familyCount').textContent='Oggetti online: '+objects.length;
 notice('Inventario familiare aggiornato.');
}
el('familySignup').onsubmit=async e=>{
 e.preventDefault();
 const btn=e.submitter;btn.disabled=true;
 try{
  const response=await fetch(base+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:el('signupEmail').value.trim(),password:el('signupPass').value})});
  const data=await response.json();
  el('signupPass').value='';
  if(!response.ok)throw Error(data.msg||data.message||'Registrazione non riuscita');
  notice('Richiesta inviata. Controlla la tua email e conferma l’account. Per accedere alla casa serve un invito.');
 }catch(err){notice('Registrazione: '+err.message)}
 finally{btn.disabled=false}
};
el('familyForm').onsubmit=async e=>{
 e.preventDefault();const btn=e.submitter;btn.disabled=true;
 try{
 const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:el('familyEmail').value.trim(),password:el('familyPass').value})});
 const d=await r.json();el('familyPass').value='';if(!r.ok)throw Error(d.msg||d.message||'Accesso non riuscito');
 const houses=await get('/rest/v1/homes?select=id,name',d.access_token);
 if(houses.length!==1)throw Error('Questa prova richiede una sola casa');
 token=d.access_token;refreshToken=d.refresh_token;localStorage.setItem(SESSION_KEY,refreshToken);house=houses[0];el('familyHouse').textContent=house.name;
 await load();await syncEdits();await load();await uploadNew();el('familyForm').hidden=true;el('familySignupBox').hidden=true;el('familyOnline').hidden=false;
 }catch(err){notice('Errore: '+err.message)}finally{btn.disabled=false}
};
async function uploadNew(){
 if(!token||!house||sending||!navigator.onLine)return;
 sending=true;
 try{
  const todo=db.items.filter(i=>i.name&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(i.id)&&pendingCreates.has(i.id)&&!seenIds.has(i.id)&&!cloudIds.has(i.id)&&!deletingIds.has(i.id));
  for(const i of todo){
   let imagePath=null;
   if(i.photo){try{imagePath=await uploadPhoto(i)}catch(e){notice('Foto ancora sul telefono: '+e.message);continue}}
   if(i.place&&!cloudPlaceIds.has(i.place)){notice('Posizione locale da sincronizzare prima dell’oggetto.');continue}
   const row={id:i.id,home_id:house.id,title:i.name,kind:i.kind==='book'?'book':'object',author:i.author||null,isbn:i.kind==='book'?i.barcode||null:null,description:i.desc||null,location_id:i.place||null,estimated_value:i.value===''?null:Number(i.value),created_by:null,image_url:imagePath};
   const res=await familyFetch(base+'/rest/v1/items?on_conflict=id',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});
   if(!res.ok){const err=await res.json().catch(()=>({}));throw Error(err.message||'Errore salvataggio')}
   cloudIds.add(i.id);seenIds.add(i.id);saveSeen();pendingCreates.delete(i.id);saveCreates();
   const confirmed=await get('/rest/v1/items?select=id,location_id&id=eq.'+encodeURIComponent(i.id)+'&home_id=eq.'+encodeURIComponent(house.id),token);
   if(confirmed.length!==1||confirmed[0].location_id!==(i.place||null))throw Error('Posizione non confermata online per '+i.name);
  }
  await load();
 }catch(e){notice('Sincronizzazione da riprovare: '+e.message)}
 finally{sending=false}
}
async function syncEdits(){
 if(!token||!house||!navigator.onLine)return;
 for(const [id,edit] of pendingEdits){
  try{
   const r=await familyFetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(id)+'&home_id=eq.'+encodeURIComponent(house.id),{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({title:edit.name,description:edit.desc||null,location_id:edit.place||null})});
   const rows=await r.json();
   if(!r.ok||!Array.isArray(rows)||rows.length!==1)throw Error(rows?.message||'Aggiornamento non confermato');
   pendingEdits.delete(id);saveEdits();notice('Modifica offline sincronizzata.');
  }catch(e){notice('Modifica in attesa: '+e.message);break}
 }
}
window.familySyncQueue=id=>{if(id&&!cloudIds.has(id)&&!pendingCreates.has(id)){pendingCreates.add(id);saveCreates()}if(token&&house){if(navigator.onLine)void syncEdits().then(uploadNew);else notice('Oggetto salvato sul telefono: sarà sincronizzato quando torni online.')}};
window.addEventListener('online',()=>{if(token&&house){void syncEdits().then(uploadNew)}});
window.familyUpdateItem=async item=>{
 pendingEdits.set(item.id,{name:item.name,desc:item.desc,place:item.place});saveEdits();
 if(!token||!house||!cloudIds.has(item.id)){notice('Modifica salvata soltanto sul dispositivo di prova.');return}
 if(!navigator.onLine){notice('Modifica salvata sul telefono: sarà sincronizzata quando torni online.');return}
 try{
  const res=await familyFetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(item.id)+'&home_id=eq.'+encodeURIComponent(house.id),{
   method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},
   body:JSON.stringify({title:item.name,description:item.desc||null,location_id:item.place&&cloudPlaceIds.has(item.place)?item.place:null})
  });
  const result=await res.json().catch(()=>null);
  if(!res.ok||!Array.isArray(result)||result.length!==1)throw Error(result?.message||'Conferma server non ricevuta');
  pendingEdits.delete(item.id);saveEdits();
  if(item.photo&&item.photo.startsWith('data:image/')){
   pendingPhotos.add(item.id);
   try{
    const path=await uploadPhoto(item);
    const p=await familyFetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(item.id)+'&home_id=eq.'+encodeURIComponent(house.id),{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({image_url:path})});
    const a=await p.json().catch(()=>null);
    if(!p.ok||!Array.isArray(a)||a.length!==1)throw Error(a?.message||'Associazione foto non confermata');
    pendingPhotos.delete(item.id);
    notice('Fotografia salvata online.');
   }catch(err){notice('Foto salvata solo sul telefono: '+err.message+'. Non aggiornare inventario.')}
   return;
  }
  notice('Nome, descrizione e posizione aggiornati online.');
 }catch(err){notice('Modifica salvata solo in locale: '+err.message+'. Non premere Aggiorna inventario.')}
};
window.familyCreatePlace=async place=>{
 if(!token||!house){notice('Posizione salvata solo in locale: accedi a Casa di famiglia.');return}
 try{
  const result=await familyFetch(base+'/rest/v1/locations?on_conflict=id',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:place.id,home_id:house.id,name:place.name})});
  const rows=await result.json().catch(()=>null);
  if(!result.ok||!Array.isArray(rows)||rows.length!==1)throw Error(rows?.message||'Salvataggio non confermato');
  cloudPlaceIds.add(place.id);
  notice('Posizione salvata su Casa di famiglia.');
 }catch(err){notice('Posizione soltanto in locale: '+err.message)}
};
window.familyDeleteItem=async id=>{
 if(!token||!house){notice('Accedi a Casa di famiglia prima di eliminare.');return false}
 if(!cloudIds.has(id)){notice('Oggetto non ancora sincronizzato: eliminazione online non necessaria.');return true}
 if(!navigator.onLine){notice('Offline: eliminazione annullata.');return false}
 deletingIds.add(id);
 try{
  const response=await familyFetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(id)+'&home_id=eq.'+encodeURIComponent(house.id),{
   method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+token,Prefer:'return=representation'}
  });
  const rows=await response.json().catch(()=>null);
  if(!response.ok||!Array.isArray(rows)||rows.length!==1)throw Error(rows?.message||'Eliminazione non confermata dal server');
  const check=await get('/rest/v1/items?select=id&id=eq.'+encodeURIComponent(id)+'&home_id=eq.'+encodeURIComponent(house.id),token);
  if(check.length)throw Error('L’oggetto risulta ancora online: eliminazione non confermata');
  cloudIds.delete(id);
  pendingEdits.delete(id);saveEdits();
  notice('Eliminazione confermata anche online.');
  return true;
 }catch(e){notice('Eliminazione non eseguita: '+e.message);return false}
 finally{setTimeout(()=>deletingIds.delete(id),1500)}
};
el('familyRename').onclick=async()=>{
 if(!token||!house)return;
 const row=db.items.find(i=>i.name==='Prova sincronizzazione'&&cloudIds.has(i.id));
 if(!row){notice('Oggetto di prova non trovato: nessuna modifica effettuata.');return}
 const newTitle='Prova sincronizzazione modificata';
 if(!confirm('Rinominare “Prova sincronizzazione” in “'+newTitle+'” sul database familiare?'))return;
 try{
  const res=await familyFetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(row.id)+'&home_id=eq.'+encodeURIComponent(house.id),{
    method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},
    body:JSON.stringify({title:newTitle})
  });
  const data=await res.json().catch(()=>[]);
  if(!res.ok)throw Error(data.message||'Modifica non riuscita');
  if(!Array.isArray(data)||data.length!==1)throw Error('Modifica non confermata dal server');
  await load();notice('Nome modificato su Supabase: '+newTitle);
 }catch(e){notice('Errore modifica: '+e.message)}
};
el('familyReload').onclick=()=>syncEdits().then(load).then(uploadNew).catch(err=>notice(err.message));
el('familyExit').onclick=()=>{localStorage.removeItem(SESSION_KEY);refreshToken=null;token=null;house=null;el('familyForm').hidden=false;el('familySignupBox').hidden=false;el('familyOnline').hidden=true;notice('Disconnessa. I dati già caricati restano in questa copia di prova.')};
async function restoreSession(){
 const saved=localStorage.getItem(SESSION_KEY);
 if(!saved)return;
 refreshToken=saved;
 if(!navigator.onLine){notice('Sei offline: puoi consultare gli oggetti già salvati. L’accesso familiare riprenderà quando torna Internet.');return}
 try{
  await renew();
  const houses=await get('/rest/v1/homes?select=id,name',token);
  if(houses.length!==1)throw Error('Casa non disponibile');
  house=houses[0];el('familyHouse').textContent=house.name;
  await load();await syncEdits();await load();await uploadNew();el('familyForm').hidden=true;el('familySignupBox').hidden=true;el('familyOnline').hidden=false;
  notice('Accesso ripristinato.');
 }catch(e){
  if(!navigator.onLine||e instanceof TypeError){notice('Connessione non disponibile: gli oggetti salvati restano consultabili. Riprova quando torni online.');return}
  localStorage.removeItem(SESSION_KEY);refreshToken=null;token=null;house=null;
  notice('Effettua nuovamente l’accesso.');
 }
}
window.addEventListener('online',()=>{if(!token&&refreshToken)void restoreSession()});
void restoreSession();
})();
