/* Versione famiglia in prova: autenticazione e sola lettura online. */
(()=>{
const base='https://ephdnunjudbwlgbxdadm.supabase.co';
const key='sb_publishable_3kcIRxESMdgXMEwvFs3_0A_0JZkJqZT';
const home=document.getElementById('home');
const panel=document.createElement('section');panel.className='panel';
panel.innerHTML='<h3>🏡 Casa di famiglia</h3><form id="familyForm"><label>Email<input type="email" id="familyEmail" required autocomplete="email"></label><label>Password<input type="password" id="familyPass" required autocomplete="current-password"></label><button class="primary">Accedi</button></form><section id="familyOnline" hidden><p id="familyHouse"></p><p id="familyCount"></p><button type="button" class="secondary" id="familyReload">Aggiorna inventario</button><button type="button" class="secondary" id="familyExit">Esci</button></section><p class="hint" id="familyMsg" role="status">Gli oggetti online compariranno nella sezione Oggetti dopo l’accesso.</p>';
home.append(panel);
const el=id=>document.getElementById(id);
let token=null,house=null;
const notice=s=>el('familyMsg').textContent=s;
async function get(path,t){const r=await fetch(base+path,{headers:{apikey:key,Authorization:'Bearer '+t},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.message||'Errore di lettura');return d}
async function load(){
 const objects=await get('/rest/v1/items?select=id,kind,title,author,isbn,description,image_url,location_id,estimated_value,created_at&home_id=eq.'+house.id,token);
 const places=await get('/rest/v1/locations?select=id,name&home_id=eq.'+house.id,token);
 // Aggiorna solo la copia locale usata dalle schermate dell'app di prova.
 db.items=objects.map(i=>({id:i.id,kind:i.kind,name:i.title,author:i.author||'',barcode:i.isbn||'',desc:i.description||'',photo:i.image_url||'',place:i.location_id||'',value:i.estimated_value??'',created:Date.parse(i.created_at)||Date.now()}));
 db.places=places.map(p=>({id:p.id,name:p.name}));
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
 await load();el('familyForm').hidden=true;el('familyOnline').hidden=false;
 }catch(err){notice('Errore: '+err.message)}finally{btn.disabled=false}
};
window.familySyncQueue=()=>{if(token)notice('Nuova modifica locale: sincronizzazione online non ancora attiva.');};
el('familyReload').onclick=()=>load().catch(err=>notice(err.message));
el('familyExit').onclick=()=>{token=null;house=null;el('familyForm').hidden=false;el('familyOnline').hidden=true;notice('Disconnessa. I dati già caricati restano in questa copia di prova.')};
})();
