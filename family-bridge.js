/* Versione famiglia in prova: autenticazione e sola lettura online. */
(()=>{
const base='https://ephdnunjudbwlgbxdadm.supabase.co';
const key='sb_publishable_3kcIRxESMdgXMEwvFs3_0A_0JZkJqZT';
const home=document.getElementById('home');
const panel=document.createElement('section');panel.className='panel';
panel.innerHTML='<h3>🏡 Casa di famiglia</h3><form id="familyForm"><label>Email<input type="email" id="familyEmail" required autocomplete="email"></label><label>Password<input type="password" id="familyPass" required autocomplete="current-password"></label><button class="primary">Accedi</button></form><section id="familyOnline" hidden><p id="familyHouse"></p><p id="familyCount"></p><button type="button" class="secondary" id="familyReload">Aggiorna inventario</button><button type="button" class="secondary" id="familyRename">Rinomina oggetto di prova</button><button type="button" class="secondary" id="familyExit">Esci</button></section><p class="hint" id="familyMsg" role="status">Gli oggetti online compariranno nella sezione Oggetti dopo l’accesso.</p>';
home.append(panel);
const el=id=>document.getElementById(id);
let token=null,house=null,sending=false;
const cloudIds=new Set();
const notice=s=>el('familyMsg').textContent=s;
async function get(path,t){const r=await fetch(base+path,{headers:{apikey:key,Authorization:'Bearer '+t},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.message||'Errore di lettura');return d}
async function load(){
 const objects=await get('/rest/v1/items?select=id,kind,title,author,isbn,description,image_url,location_id,estimated_value,created_at&home_id=eq.'+house.id,token);
 const places=await get('/rest/v1/locations?select=id,name&home_id=eq.'+house.id,token);
 // Aggiorna solo la copia locale usata dalle schermate dell'app di prova.
 objects.forEach(i=>cloudIds.add(i.id));
 const pending=db.items.filter(i=>!cloudIds.has(i.id));
 db.items=[...objects.map(i=>({id:i.id,kind:i.kind,name:i.title,author:i.author||'',barcode:i.isbn||'',desc:i.description||'',photo:i.image_url||'',place:i.location_id||'',value:i.estimated_value??'',created:Date.parse(i.created_at)||Date.now()})),...pending];
 db.places=[...places.map(p=>({id:p.id,name:p.name})),...db.places.filter(p=>!places.some(c=>c.id===p.id))];
 localStorage.setItem('dlm-test-v1',JSON.stringify(db));
 renderStats();renderPlaces();renderItems();
 el('familyCount').textContent='Oggetti online: '+objects.length;
 notice('Inventario familiare aggiornato.');
}
el('familyForm').onsubmit=async e=>{
 e.preventDefault();const btn=e.submitter;btn.disabled=true;
 try{
 const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:el('familyEmail').value.trim(),password:el('familyPass').value})});
 const d=await r.json();el('familyPass').value='';if(!r.ok)throw Error(d.msg||d.message||'Accesso non riuscito');
 const houses=await get('/rest/v1/homes?select=id,name',d.access_token);
 if(houses.length!==1)throw Error('Questa prova richiede una sola casa');
 token=d.access_token;house=houses[0];el('familyHouse').textContent=house.name;
 await load();await uploadNew();el('familyForm').hidden=true;el('familyOnline').hidden=false;
 }catch(err){notice('Errore: '+err.message)}finally{btn.disabled=false}
};
async function uploadNew(){
 if(!token||!house||sending||!navigator.onLine)return;
 sending=true;
 try{
  const todo=db.items.filter(i=>i.name&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(i.id)&&!cloudIds.has(i.id));
  for(const i of todo){
   if(i.photo){notice('Foto non sincronizzate: oggetto mantenuto in locale.');continue}
   if(i.place&&!cloudIds.has(i.place)){notice('Posizione locale da sincronizzare prima dell’oggetto.');continue}
   const row={id:i.id,home_id:house.id,title:i.name,kind:i.kind==='book'?'book':'object',author:i.author||null,isbn:i.kind==='book'?i.barcode||null:null,description:i.desc||null,location_id:i.place||null,estimated_value:i.value===''?null:Number(i.value),created_by:null};
   const res=await fetch(base+'/rest/v1/items?on_conflict=id',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});
   if(!res.ok){const err=await res.json().catch(()=>({}));throw Error(err.message||'Errore salvataggio')}
   cloudIds.add(i.id);
  }
  await load();
 }catch(e){notice('Sincronizzazione da riprovare: '+e.message)}
 finally{sending=false}
}
window.familySyncQueue=()=>{if(token&&house)void uploadNew()};
window.familyUpdateItem=async item=>{
 if(!token||!house||!cloudIds.has(item.id)){notice('Modifica salvata soltanto sul dispositivo di prova.');return}
 if(!navigator.onLine){notice('Offline: modifica locale da riconciliare. Non aggiornare l’inventario.');return}
 try{
  const res=await fetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(item.id)+'&home_id=eq.'+encodeURIComponent(house.id),{
   method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},
   body:JSON.stringify({title:item.name,description:item.desc||null})
  });
  const result=await res.json().catch(()=>null);
  if(!res.ok||!Array.isArray(result)||result.length!==1)throw Error(result?.message||'Conferma server non ricevuta');
  notice('Nome e descrizione aggiornati online.');
 }catch(err){notice('Modifica salvata solo in locale: '+err.message+'. Non premere Aggiorna inventario.')}
};
window.familyCreatePlace=async place=>{
 if(!token||!house){notice('Posizione salvata solo in locale: accedi a Casa di famiglia.');return}
 try{
  const result=await fetch(base+'/rest/v1/locations?on_conflict=id',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:place.id,home_id:house.id,name:place.name})});
  const rows=await result.json().catch(()=>null);
  if(!result.ok||!Array.isArray(rows)||rows.length!==1)throw Error(rows?.message||'Salvataggio non confermato');
  notice('Posizione salvata su Casa di famiglia.');
 }catch(err){notice('Posizione soltanto in locale: '+err.message)}
};
window.familyDeleteItem=async id=>{
 if(!token||!house){notice('Accedi a Casa di famiglia prima di eliminare.');return false}
 if(!cloudIds.has(id)){notice('Oggetto non ancora sincronizzato: eliminazione online non necessaria.');return true}
 if(!navigator.onLine){notice('Offline: eliminazione annullata.');return false}
 try{
  const response=await fetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(id)+'&home_id=eq.'+encodeURIComponent(house.id),{
   method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+token,Prefer:'return=representation'}
  });
  const rows=await response.json().catch(()=>null);
  if(!response.ok||!Array.isArray(rows)||rows.length!==1)throw Error(rows?.message||'Eliminazione non confermata dal server');
  cloudIds.delete(id);
  notice('Oggetto eliminato anche da Casa di famiglia.');
  return true;
 }catch(e){notice('Eliminazione non eseguita: '+e.message);return false}
};
el('familyRename').onclick=async()=>{
 if(!token||!house)return;
 const row=db.items.find(i=>i.name==='Prova sincronizzazione'&&cloudIds.has(i.id));
 if(!row){notice('Oggetto di prova non trovato: nessuna modifica effettuata.');return}
 const newTitle='Prova sincronizzazione modificata';
 if(!confirm('Rinominare “Prova sincronizzazione” in “'+newTitle+'” sul database familiare?'))return;
 try{
  const res=await fetch(base+'/rest/v1/items?id=eq.'+encodeURIComponent(row.id)+'&home_id=eq.'+encodeURIComponent(house.id),{
    method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},
    body:JSON.stringify({title:newTitle})
  });
  const data=await res.json().catch(()=>[]);
  if(!res.ok)throw Error(data.message||'Modifica non riuscita');
  if(!Array.isArray(data)||data.length!==1)throw Error('Modifica non confermata dal server');
  await load();notice('Nome modificato su Supabase: '+newTitle);
 }catch(e){notice('Errore modifica: '+e.message)}
};
el('familyReload').onclick=()=>load().then(uploadNew).catch(err=>notice(err.message));
el('familyExit').onclick=()=>{token=null;house=null;el('familyForm').hidden=false;el('familyOnline').hidden=true;notice('Disconnessa. I dati già caricati restano in questa copia di prova.')};
})();
