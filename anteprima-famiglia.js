const KEY='dlm-family-v1';const DRAFT_KEY='dlm-family-draft-v1';let db={places:[],items:[]},photoData='',stream=null,scanTimer=null,editing=null;try{db=JSON.parse(localStorage.getItem(KEY))||db}catch{};const $=s=>document.querySelector(s);const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch(e){toast('Memoria piena: usa foto più leggere');return false}};const uid=()=>Math.random().toString(36).slice(2,10).toUpperCase();const placeName=id=>db.places.find(x=>x.id===id)?.name||'Posizione non assegnata';function toast(t){let el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}function page(p){if(document.querySelector('#add.page.active')&&p!=='add')saveDraft();stopCamera();document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.page===p));if(p==='scan'&&!('BarcodeDetector' in window))loadZXing();if(p==='places')renderPlaces();if(p==='items'||p==='books')renderItems();if(p==='home')renderStats();scrollTo(0,0)}document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='add') {editing=null;resetForm();if(b.dataset.book){$('#kind').value='book';updateKind()}else {localStorage.removeItem(DRAFT_KEY);updateKind()}}if(b.dataset.page==='scan'&&scanForItem)scanForItem=false;page(b.dataset.page)}));function renderStats(){$('#stats').innerHTML=`<div><strong>${db.items.length}</strong><span>Oggetti e libri</span></div><div><strong>${db.places.length}</strong><span>Posizioni</span></div><div><strong>${db.items.filter(x=>x.kind==='book').length}</strong><span>Libri</span></div>`}function qrData(id){return 'DLM-P-'+id}function qrSVG(code){try{let q=new LocalQRCode(-1,LocalQRError.M);q.addData(code);q.make();let n=q.getModuleCount(),rect=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))rect.push(`<rect x="${x+4}" y="${y+4}" width="1" height="1"/>`);return `<svg class="qr" role="img" aria-label="Codice QR della posizione" viewBox="0 0 ${n+8} ${n+8}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><g fill="#43246c">${rect.join('')}</g></svg>`}catch(e){return '<p>QR non disponibile</p>'}}function renderPlaces(){let locationPhotos={};try{locationPhotos=JSON.parse(localStorage.getItem('dlm-family-location-photos-v1')||'{}')}catch{};for(const p of db.places){if(locationPhotos[p.id])p.photo=locationPhotos[p.id]}let h=db.places.map(p=>`<article class="panel"><h3>📍 ${safe(p.name)}</h3>${p.photo?`<img src="${safe(p.photo)}" alt="Foto di ${safe(p.name)}" style="width:100%;max-height:220px;object-fit:cover;border-radius:14px;margin:8px 0">`:``}<div class="row"><button type="button" class="secondary" onclick="choosePlacePhoto(\'${p.id}\')">📷 ${p.photo?"Cambia foto":"Aggiungi foto"}</button></div><p class="muted">${db.items.filter(i=>i.place===p.id).length} oggetti · Codice ${qrData(p.id)}</p>${qrSVG(qrData(p.id))}<details style="margin:14px 0"><summary style="cursor:pointer;padding:14px;border-radius:14px;background:#f1e7fb;color:#43246c;font-weight:700">📦 Mostra oggetti (${db.items.filter(i=>i.place===p.id).length})</summary><div style="padding:8px 2px">${db.items.filter(i=>i.place===p.id).map(i=>`<button type="button" class="secondary" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin:7px 0" onclick="showItem(\'${i.id}\')">${i.photo?`<img src="${safe(i.photo)}" alt="" style="width:46px;height:46px;object-fit:cover;border-radius:10px;flex-shrink:0">`:`<span style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;font-size:25px;flex-shrink:0">📦</span>`}<span>${safe(i.name)}</span></button>`).join("")||"<p>Nessun oggetto in questa posizione.</p>"}</div></details><div class="row"><button class="secondary" onclick="printQR('${p.id}')">🖨️ Stampa</button><button class="secondary" onclick="deletePlace('${p.id}')">Elimina</button></div></article>`).join('');$('#placeList').innerHTML=h||'<div class="empty">📍 Crea la tua prima posizione!</div>';$('#itemPlace').innerHTML='<option value="">Da assegnare</option>'+db.places.map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join('')}window.choosePlacePhoto=id=>{const picker=document.getElementById('placePhotoPicker');picker.dataset.placeId=id;picker.value='';picker.click()};
document.getElementById('placePhotoPicker').addEventListener('change',async e=>{
 const file=e.target.files?.[0],id=e.target.dataset.placeId,p=db.places.find(x=>x.id===id);
 if(!file||!p)return;
 try{
  const image=new Image(),url=URL.createObjectURL(file);
  try{
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});
   const scale=Math.min(1,640/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   const previous=p.photo;p.photo=canvas.toDataURL('image/jpeg',0.65);
   try{const photos=JSON.parse(localStorage.getItem('dlm-family-location-photos-v1')||'{}');photos[p.id]=p.photo;localStorage.setItem('dlm-family-location-photos-v1',JSON.stringify(photos))}catch(err){p.photo=previous;toast('Spazio insufficiente per salvare la foto');return}
   save()
   renderPlaces();toast('Foto della posizione salvata sul telefono 💜');
  }finally{URL.revokeObjectURL(url)}
 }catch{toast('Non riesco a leggere questa fotografia')}
});
window.printQR=id=>{const p=db.places.find(x=>x.id===id);if(!p)return;let w=window.open('','_blank');if(!w){toast('Consenti le finestre popup per stampare');return}w.document.write(`<html><meta charset="utf-8"><title>Etichetta</title><body style="text-align:center;font-family:Arial"><h2>${safe(p.name)}</h2>${qrSVG(qrData(id))}<p>${qrData(id)}</p><script>setTimeout(()=>print(),250)<\/script></body></html>`);w.document.close()};window.deletePlace=id=>{if(!confirm('Eliminare la posizione? Gli oggetti resteranno catalogati, senza posizione.'))return;db.places=db.places.filter(p=>p.id!==id);db.items.forEach(i=>{if(i.place===id)i.place=''});save();renderPlaces();toast('Posizione eliminata')};$('#placeForm').addEventListener('submit',e=>{e.preventDefault();const place={id:crypto.randomUUID(),name:$('#placeName').value.trim()};db.places.push(place);if(save()){e.target.reset();renderPlaces();toast('Posizione e QR creati!');if(window.familyCreatePlace)window.familyCreatePlace(place)}});function renderItems(){const list=(target,data)=>{$(target).innerHTML=data.map(i=>`<article class="entry"><div class="thumb">${i.photo?`<img class="thumb" src="${safe(i.photo)}" alt="">`:i.kind==='book'?'📖':'📦'}</div><div class="info"><strong>${safe(i.name)}</strong><small>${safe(i.author||placeName(i.place))}</small></div><button aria-label="Apri" onclick="showItem('${i.id}')">›</button></article>`).join('')||'<div class="empty">Niente qui per ora. Aggiungiamo qualcosa? 💜</div>'};let q=$('#itemFilter').value.toLocaleLowerCase();list('#itemList',db.items.filter(i=>[i.name,i.desc,i.author,i.barcode,placeName(i.place)].some(x=>String(x||'').toLocaleLowerCase().includes(q))));list('#bookList',db.items.filter(i=>i.kind==='book'))}$('#itemFilter').addEventListener('input',renderItems);$('#quickSearch').addEventListener('input',e=>{$('#itemFilter').value=e.target.value;page('items')});function resetForm(){if(document.getElementById('coverChoices'))document.getElementById('coverChoices').innerHTML='';document.querySelector('#bookTitleSearchPanel')?.remove();$('#itemForm').reset();$('#editId').value='';$('#photoPreview').hidden=true;$('#photoPreview').removeAttribute('src');photoData='';for(const id of ['itemName','author','barcode','desc','value'])$('#'+id).value='';$('#itemPlace').value='';$('#formHeading').textContent='Aggiungi oggetto ✨';renderPlaces()}$('#photoCameraBtn').onclick=()=>$('#photoCamera').click();$('#photoGalleryBtn').onclick=()=>$('#photo').click();async function onPhoto(e){let f=e.target.files[0];if(!f)return;try{let img=new Image(),url=URL.createObjectURL(f);await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});let max=720,scale=Math.min(1,max/Math.max(img.width,img.height));let c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);photoData=c.toDataURL('image/jpeg',.68);lastAutoBookCover='';URL.revokeObjectURL(url);$('#photoPreview').src=photoData;$('#photoPreview').hidden=false}catch{toast('Impossibile leggere la foto')}finally{saveDraft()}}['photo','photoCamera'].forEach(id=>$('#'+id).addEventListener('change',onPhoto));$('#itemForm').addEventListener('submit',e=>{e.preventDefault();let old=db.items.find(x=>x.id===$('#editId').value);let i={id:old?.id||crypto.randomUUID(),kind:$('#kind').value,name:$('#itemName').value.trim(),author:$('#author').value.trim(),barcode:$('#barcode').value.trim(),desc:$('#desc').value.trim(),place:$('#itemPlace').value,value:$('#value').value,photo:photoData||old?.photo||'',created:old?.created||Date.now()};if(!i.name)return; if(old) Object.assign(old,i);else db.items.unshift(i);if(save()){editing=null;localStorage.removeItem(DRAFT_KEY);renderItems();page('items');toast('Salvato! 💜');if(old&&window.familyUpdateItem)window.familyUpdateItem(i);else if(!old&&window.familySyncQueue)window.familySyncQueue(i.id)}});window.showItem=id=>{let i=db.items.find(x=>x.id===id);if(!i)return;$('#detailBody').innerHTML=`<h2>${safe(i.name)}</h2>${i.photo?`<img class="detail-photo" src="${safe(i.photo)}" alt="Foto dell'oggetto">`:'<div class="scan-box">📦</div>'}<div class="panel"><p class="pill">${i.kind==='book'?'📚 Libro':'📦 Oggetto'}</p>${i.author?`<p><b>Autore:</b> ${safe(i.author)}</p>`:''}<p>${safe(i.desc)||'Nessuna descrizione'}</p><p><b>📍 Posizione:</b> ${safe(placeName(i.place))}</p>${i.barcode?`<p><b>Codice:</b> ${safe(i.barcode)}</p>`:''}${i.value?`<p><b>Valore inserito:</b> ${safe(i.value)} €</p>`:''}<div class="row"><button class="secondary" onclick="editItem('${i.id}')">✏️ Modifica</button><button class="secondary" onclick="deleteItem('${i.id}')">🗑️ Elimina</button></div></div>`;page('detail')};window.editItem=id=>{let i=db.items.find(x=>x.id===id);if(!i)return;editing=id;resetForm();editing=id;$('#editId').value=id;for(let [k,v] of [['kind',i.kind],['itemName',i.name],['author',i.author],['barcode',i.barcode],['desc',i.desc],['itemPlace',i.place],['value',i.value]])$('#'+k).value=v||'';photoData=i.photo||'';if(photoData){$('#photoPreview').src=photoData;$('#photoPreview').hidden=false}$('#formHeading').textContent='Modifica oggetto ✏️';updateKind();page('add');saveDraft()};window.deleteItem=async id=>{if(!confirm('Eliminare definitivamente questo elemento?'))return;if(window.familyDeleteItem){const ok=await window.familyDeleteItem(id);if(!ok)return}db.items=db.items.filter(i=>i.id!==id);save();page('items');toast('Elemento eliminato')};

// Ricerca ISBN: cataloghi in parallelo; nessuna copertina di opere generiche viene accettata automaticamente.
const isbnLookupBtn=$('#lookupBook');
function checkISBN(code){if(!/^(?:\d{13}|\d{9}[\dX])$/.test(code))return false;let sum=0;if(code.length===13){for(let n=0;n<12;n++)sum+=Number(code[n])*(n%2?3:1);return (10-sum%10)%10===Number(code[12])}for(let n=0;n<10;n++)sum+=(10-n)*(code[n]==='X'?10:Number(code[n]));return sum%11===0}
async function getCatalogJSON(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4500);try{const response=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!response.ok)throw Error('HTTP '+response.status);return await response.json()}finally{clearTimeout(timer)}}
function isbn10of13(code){if(!/^978\d{10}$/.test(code))return '';const nine=code.slice(3,12);let sum=0;for(let n=0;n<9;n++)sum+=(10-n)*Number(nine[n]);let check=(11-(sum%11))%11;return nine+(check===10?'X':check)}
function normISBN(s){return String(s||'').replace(/[\s-]/g,'').toUpperCase()}
function exactVolume(v,isbn){const a=v?.industryIdentifiers||[];const alternate=isbn10of13(isbn);return a.some(x=>{const id=normISBN(x.identifier);return id===isbn||(alternate&&id===alternate)})}
function uniqueNames(arr){return [...new Set((arr||[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))]}
async function coverToPhoto(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),3000);try{const response=await fetch(url,{signal:ctrl.signal});if(!response.ok||!(response.headers.get('content-type')||'').startsWith('image/'))return null;const blob=await response.blob();if(blob.size<1800||blob.size>2500000)return null;const objectURL=URL.createObjectURL(blob),img=new Image();try{await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=objectURL});if(img.naturalWidth<70||img.naturalHeight<90)return null;const scale=Math.min(1,380/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.63)}finally{URL.revokeObjectURL(objectURL)}}catch{return null}finally{clearTimeout(timer)}}
// Copertina fornita dall'utente per l'edizione italiana verificata di Ramses.
const verifiedBooks={'9788865268001':{title:'Il Piccolo Principe',authors:['Antoine de Saint-Exupéry'],publisher:'Nord-Sud',date:'',cover:''},'9788804430308':{title:'Il romanzo di Ramses – Il figlio della luce',authors:['Christian Jacq'],publisher:'Mondadori',date:'1997',cover:'data:image/jpeg;base64,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'}};
let lastAutoBookCover='';
async function lookupISBN(){
 const isbn=normISBN($('#barcode').value);
 if(!checkISBN(isbn)){toast('Controlla il codice ISBN: inserisci un ISBN valido');return}
 if(!navigator.onLine){toast('Per cercare un libro serve Internet');return}
 isbnLookupBtn.disabled=true;isbnLookupBtn.textContent='📚 Cerco libro e copertina…';
 try{
  const verified=verifiedBooks[isbn];
  let title='',authors=[],publisher='',date='',source='',exactCovers=[],reachable=false;
  if(verified){title=verified.title;authors=verified.authors;publisher=verified.publisher;date=verified.date;source='scheda verificata'}
  else{
   const [gResult,eResult,sResult]=await Promise.allSettled([
    getCatalogJSON('https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent('isbn:'+isbn)+'&maxResults=5'),
    getCatalogJSON('https://openlibrary.org/isbn/'+encodeURIComponent(isbn)+'.json'),
    getCatalogJSON('https://openlibrary.org/search.json?isbn='+encodeURIComponent(isbn)+'&limit=3&fields=title,author_name,first_publish_year,publisher,isbn,cover_i')
   ]);
   const g=gResult.status==='fulfilled'?gResult.value:null;
   const e=eResult.status==='fulfilled'?eResult.value:null;
   const r=sResult.status==='fulfilled'?sResult.value:null;
   reachable=!!(g||e||r);
   const v=(g?.items||[]).map(x=>x.volumeInfo).find(x=>exactVolume(x,isbn));
   const d=r?.docs?.find(x=>(x.isbn||[]).some(k=>normISBN(k)===isbn||normISBN(k)===isbn10of13(isbn)));
   // Seconda possibilità: endpoint libri che può restituire schede assenti dalla ricerca.
   let alternate=null;
   if(!e?.title&&!v?.title&&!d?.title){
    try{const bookMap=await getCatalogJSON('https://openlibrary.org/api/books?bibkeys=ISBN:'+encodeURIComponent(isbn)+'&jscmd=data&format=json');alternate=bookMap['ISBN:'+isbn]||null}catch(err){console.warn('Scheda alternativa:',err)}
   }
   // Titolo della scheda ISBN, non dell'opera generica.
   title=e?.title||v?.title||d?.title||alternate?.title||'';
   if(v?.subtitle&&title===v.title)title+=': '+v.subtitle;
   source=e?.title?'Open Library':v?.title?'Google Books':'Open Library Search';
   authors=uniqueNames(v?.authors?.length?v.authors:(d?.author_name?.length?d.author_name:(alternate?.authors||[]).map(a=>a.name)));
   publisher=e?.publishers?.join(', ')||v?.publisher||d?.publisher?.[0]||alternate?.publishers?.map(p=>p.name).join(', ')||'';
   date=e?.publish_date||v?.publishedDate||String(d?.first_publish_year||'');
   if(!authors.length&&e?.authors?.length){
    const results=await Promise.allSettled(e.authors.slice(0,3).filter(a=>a.key).map(a=>getCatalogJSON('https://openlibrary.org'+a.key+'.json')));
    authors=uniqueNames(results.filter(x=>x.status==='fulfilled').map(x=>x.value.name));
   }
   // Solo foto associate alla scheda della specifica edizione.
   if(alternate?.cover?.large)exactCovers.push(alternate.cover.large);
   for(const id of (e?.covers||[]))exactCovers.push('https://covers.openlibrary.org/b/id/'+id+'-L.jpg?default=false');
   exactCovers.push('https://covers.openlibrary.org/b/isbn/'+isbn+'-L.jpg?default=false');
   // La miniatura di Google Books potrebbe appartenere a un'edizione differente;
   // non viene quindi scelta automaticamente.
  }
  if(!title){toast(reachable?'ISBN non catalogato. Prova Cerca per titolo e autore.':'Cataloghi non raggiungibili. Riprova.');ensureBookSearch();return}
  if(normISBN($('#barcode').value)!==isbn)return;
  $('#kind').value='book';updateKind();$('#itemName').value=title;
  if(authors.length)$('#author').value=uniqueNames(authors).join(', ');
  const notes=[publisher&&'Editore: '+publisher,date&&'Pubblicazione: '+date].filter(Boolean).join(' · ');
  if(notes&&!$('#desc').value.trim())$('#desc').value=notes;
  if(!photoData||photoData===lastAutoBookCover){
   let nextCover=verified?.cover||'';
   if(!nextCover){for(const url of [...new Set(exactCovers)]){nextCover=await coverToPhoto(url);if(nextCover)break}}
   if(nextCover){photoData=nextCover;lastAutoBookCover=nextCover;$('#photoPreview').src=nextCover;$('#photoPreview').hidden=false}
   else {photoData='';lastAutoBookCover='';$('#photoPreview').removeAttribute('src');$('#photoPreview').hidden=true}
  }
  saveDraft();
  toast(photoData?'Libro trovato con copertina: controlla che sia la tua edizione 💜':'Libro trovato! Copertina non verificata: aggiungi una foto.');
 }catch(e){console.warn('Errore ricerca ISBN:',e);toast('Ricerca non riuscita. Riprova.')}finally{isbnLookupBtn.disabled=false;isbnLookupBtn.textContent='📖 Cerca ISBN online'}
}
// Ricerca aggiuntiva, utilizzabile anche con libri senza ISBN registrato nei cataloghi.
function ensureBookSearch(){
 if(document.querySelector('#bookTitleSearchPanel'))return;
 const panel=document.createElement('div');panel.id='bookTitleSearchPanel';panel.className='panel';
 panel.style.cssText='margin:16px 0;padding:16px;border:1px solid #e5d3f1;border-radius:18px';
 panel.innerHTML='<strong>🔎 Cerca un libro per titolo e autore</strong><p class="muted">Utile quando il codice non viene riconosciuto. Scegli la scheda che corrisponde al tuo libro.</p><input id="bookQueryTitle" type="text" placeholder="Titolo del libro" aria-label="Titolo da cercare" style="width:100%;margin:6px 0 10px"><input id="bookQueryAuthor" type="text" placeholder="Autore (facoltativo)" aria-label="Autore da cercare" style="width:100%;margin-bottom:10px"><button type="button" id="runBookSearch" class="secondary">Cerca per titolo</button><div id="bookSearchResults" aria-live="polite"></div>';
 const anchor=$('#lookupBook');anchor.parentElement.insertAdjacentElement('afterend',panel);
 $('#bookQueryTitle').value=$('#itemName').value||'';$('#bookQueryAuthor').value=$('#author').value||'';
 $('#runBookSearch').addEventListener('click',searchByBookTitle);
}
function sameWords(a,b){const clean=t=>String(t||'').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();return clean(a)===clean(b)}
async function searchByBookTitle(){
 const title=$('#bookQueryTitle').value.trim(),author=$('#bookQueryAuthor').value.trim(),results=$('#bookSearchResults');
 if(title.length<3){toast('Scrivi almeno tre caratteri del titolo');return}
 $('#runBookSearch').disabled=true;results.textContent='Cerco nei cataloghi…';
 try{
  const urls=[
   'https://openlibrary.org/search.json?'+new URLSearchParams({title, ...(author?{author}:{}),limit:'8',fields:'title,author_name,edition_key,isbn,cover_i,first_publish_year,publisher'}),
   'https://www.googleapis.com/books/v1/volumes?'+new URLSearchParams({q:'intitle:'+title+(author?' inauthor:'+author:''),maxResults:'8'})
  ];
  const settled=await Promise.allSettled(urls.map(getCatalogJSON));const options=[];
  if(settled[0].status==='fulfilled')for(const d of (settled[0].value.docs||[])){
    if(!d.title)continue;options.push({title:d.title,authors:d.author_name||[],publisher:d.publisher?.[0]||'',date:String(d.first_publish_year||''),isbn:'',source:'Open Library'});
  }
  if(settled[1].status==='fulfilled')for(const entry of (settled[1].value.items||[])){
    const v=entry.volumeInfo;if(!v?.title)continue;options.push({title:v.title+(v.subtitle?': '+v.subtitle:''),authors:v.authors||[],publisher:v.publisher||'',date:v.publishedDate||'',isbn:'',source:'Google Books'});
  }
  const unique=options.filter((v,i)=>options.findIndex(x=>sameWords(x.title,v.title)&&sameWords(x.authors[0],v.authors[0]))===i).slice(0,10);
  results.replaceChildren();if(!unique.length){results.textContent='Nessun risultato. Puoi compilare i dati manualmente.';return}
  const note=document.createElement('p');note.className='muted';note.textContent='Controlla titolo e autore: la copertina va aggiunta dalla tua edizione.';results.append(note);
  unique.forEach(book=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.style.cssText='display:block;width:100%;text-align:left;margin-top:8px;white-space:normal';b.textContent=book.title+' — '+(book.authors.join(', ')||'Autore sconosciuto')+' ('+book.source+')';b.onclick=()=>{ $('#itemName').value=book.title;$('#author').value=book.authors.join(', ');if(!$('#desc').value.trim())$('#desc').value=[book.publisher&&'Editore: '+book.publisher,book.date&&'Pubblicazione: '+book.date].filter(Boolean).join(' · ');saveDraft();toast('Dati inseriti. Verifica l’edizione e aggiungi la copertina 💜');};results.append(b)});
 }catch(e){results.textContent='Ricerca non disponibile. Riprova.'}finally{$('#runBookSearch').disabled=false}
}
// Il comando è accessibile anche prima di una ricerca ISBN fallita.
setTimeout(()=>{if($('#kind')){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='🔎 Cerca per titolo';b.style.marginTop='10px';b.onclick=()=>{ensureBookSearch();$('#bookTitleSearchPanel').scrollIntoView({behavior:'smooth',block:'nearest'})};$('#lookupBook').parentElement.insertAdjacentElement('afterend',b)}},0);

// Ricerca EAN tramite Open Products Facts: conserva il codice anche se la scheda non esiste.
function isEAN(code){return /^\d{13}$/.test(code)&&checkISBN(code)}
let catalogSearchBusy=false;
async function lookupEAN(){
 const code=normISBN($('#barcode').value);
 if(!isEAN(code)){toast('Inserisci un codice EAN a 13 cifre valido');return}
 if(!navigator.onLine){toast('Serve Internet per cercare il codice');return}
 if(catalogSearchBusy)return;
 catalogSearchBusy=true;
 const btn=$('#lookupBook'),oldText=btn.textContent;
 btn.disabled=true;btn.textContent='🔎 Cerco il codice EAN…';
 try{
  const data=await getCatalogJSON('https://world.openproductsfacts.org/api/v2/product/'+encodeURIComponent(code)+'?fields=code,product_name,product_name_it,generic_name,brands,description,image_front_url,image_url,categories');
  const p=data?.status===1?data.product:null;
  const name=String(p?.product_name_it||p?.product_name||p?.generic_name||'').trim();
  if(!p||!name){toast('EAN non presente nell’archivio. Puoi inserire titolo e autore manualmente.');return}
  // Non sovrascrive dati già inseriti dall'utente.
  if(!$('#itemName').value.trim())$('#itemName').value=name;
  const notes=[p.brands&&'Marca/Editore: '+p.brands,p.description||p.categories].filter(Boolean).join(' · ');
  if(notes&&!$('#desc').value.trim())$('#desc').value=notes;
  if(!photoData){
   const cover=await coverToPhoto(p.image_front_url||p.image_url||'');
   if(cover){photoData=cover;lastAutoBookCover=cover;$('#photoPreview').src=cover;$('#photoPreview').hidden=false}
  }
  saveDraft();toast('Prodotto trovato tramite EAN! Controlla i dati 💜');
 }catch(e){console.warn('Ricerca EAN:',e);toast('Archivio EAN non raggiungibile. Puoi inserire i dati manualmente.')}
 finally{catalogSearchBusy=false;btn.disabled=false;btn.textContent=oldText;updateCodeLookupLabel()}
}
async function lookupCode(){
 const code=normISBN($('#barcode').value);
 if(!code){toast('Prima scansiona o inserisci un codice');return}
 // ISBN-13: soltanto 978 / 979, non un qualsiasi EAN a 13 cifre.
 if((/^97[89]\d{10}$/.test(code)||/^(?:\d{9}[\dX])$/.test(code))&&checkISBN(code))return lookupISBN();
 if(isEAN(code))return lookupEAN();
 toast('Codice non valido: controlla le cifre inserite');
}
isbnLookupBtn.addEventListener('click',lookupCode);

let scanForItem=false;$('#scanForItem').onclick=()=>{saveDraft();scanForItem=true;$('#scanBack').hidden=false;page('scan')};$('#scanBack').onclick=()=>{scanForItem=false;stopCamera();page('add');restoreDraft(false)};function resolveScan(code){code=code.trim();if(!code)return;stopCamera();if(code.startsWith('DLM-P-')){let p=db.places.find(x=>x.id===code.slice(6));if(!p){$('#scanResult').innerHTML='<div class="panel">Posizione non presente in questo archivio.</div>';return}let items=db.items.filter(i=>i.place===p.id);$('#scanResult').innerHTML=`<div class="panel"><h3>📍 ${safe(p.name)}</h3><p>${items.length} oggetti in questa posizione</p>${items.map(i=>`<p>📦 ${safe(i.name)}</p>`).join('')}<button class="primary full" onclick="assignScannedPlace('${p.id}')">Aggiungi qui un oggetto</button></div>`;return}if(scanForItem){scanForItem=false;page('add');restoreDraft(false);$('#barcode').value=code;saveDraft();toast('Codice inserito nel modulo');if(/^\d{13}$/.test(code)&&isEAN(code))lookupCode();return}let item=db.items.find(i=>i.barcode===code);if(item)showItem(item.id);else $('#scanResult').innerHTML='<div class="panel">Nessun oggetto associato a questo codice. Puoi aggiungerlo manualmente.</div>'}window.assignScannedPlace=id=>{editing=null;resetForm();$('#itemPlace').value=id;page('add')};$('#manualGo').onclick=()=>resolveScan($('#manualScan').value);let html5scanner=null,zxReader=null,zxControls=null,scanBusy=false,scanTimeout=null,scanHandled=false,zxingLoading=null;
async function loadZXing(){
 if(window.ZXing?.BrowserMultiFormatReader)return true;
 if(!navigator.onLine)return false;
 if(!zxingLoading)zxingLoading=new Promise((resolve)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';script.onload=()=>resolve(!!window.ZXing?.BrowserMultiFormatReader);script.onerror=()=>resolve(false);document.head.appendChild(script)}).then(ok=>{if(!ok)zxingLoading=null;return ok});
 return zxingLoading;
}
function scanStatus(message){$('#scanMessage').hidden=false;$('#scanMessage').textContent=message}
function cameraError(){stopCamera();scanStatus('Non riesco a leggere il codice. Prova una foto dalla galleria oppure inseriscilo manualmente.');toast('Scansione non disponibile: prova dalla galleria')}
async function startCamera(){
  if(scanBusy)return;scanBusy=true;scanHandled=false;scanStatus('Carico il lettore…');$('#startScan').disabled=true;
  try{
    if('BarcodeDetector' in window){
      const supported=await BarcodeDetector.getSupportedFormats?.()||['qr_code','ean_13','ean_8','upc_a','code_128','code_39'];const formats=['qr_code','ean_13','ean_8','upc_a','code_128','code_39'].filter(f=>supported.includes(f));if(!formats.length)throw Error('Nessun formato supportato');const detector=new BarcodeDetector({formats});
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      $('#camera').srcObject=stream;$('#camera').hidden=false;await $('#camera').play();$('#scanMessage').hidden=true;
      $('#stopScan').hidden=false;$('#startScan').hidden=true;
      let detecting=false;scanTimer=setInterval(async()=>{if(detecting||!stream||$('#camera').readyState<2)return;detecting=true;try{const results=await detector.detect($('#camera'));if(results.length&&!scanHandled){scanHandled=true;resolveScan(results[0].rawValue)}}catch{}finally{detecting=false}},350);
    }else{
      if(!await loadZXing()){scanStatus('Il lettore richiede Internet al primo utilizzo. Puoi inserire il codice manualmente.');toast('Impossibile caricare il lettore');return}
      zxReader=new ZXing.BrowserMultiFormatReader(new Map(),120);
      $('#camera').hidden=false;$('#stopScan').hidden=false;$('#startScan').hidden=true;
      scanStatus('Avvio la fotocamera…');
      const video=$('#camera');
      // ZXing library avvia il flusso e analizza continuamente i fotogrammi.
      zxReader.decodeFromVideoDevice(null,video,(result,err)=>{if(result&&!scanHandled){scanHandled=true;resolveScan(result.getText())}})
        .then(()=>{}).catch(()=>cameraError());
      scanTimeout=setTimeout(()=>{if($('#scan').classList.contains('active')&&!video.videoWidth)cameraError();else if(video.videoWidth)$('#scanMessage').hidden=true},7000);
    }
  }catch(e){cameraError()}finally{scanBusy=false;$('#startScan').disabled=false}
}
function stopCamera(){clearTimeout(scanTimeout);scanTimeout=null;clearInterval(scanTimer);scanTimer=null;
  if(zxReader){try{zxReader.reset()}catch{}zxReader=null}
  if(html5scanner){const old=html5scanner;html5scanner=null;old.stop().then(()=>old.clear()).catch(()=>{})}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  const v=$('#camera');if(v.srcObject){try{v.srcObject.getTracks().forEach(t=>t.stop())}catch{}v.srcObject=null}
  v.hidden=true;$('#html5reader').hidden=true;scanHandled=false;$('#scanMessage').hidden=false;$('#scanMessage').textContent='📷 Inquadra un codice oppure scegli una foto.';
  $('#stopScan').hidden=true;$('#startScan').hidden=false;scanBusy=false
}
$('#scanImageBtn').onclick=()=>$('#scanImageFile').click();
$('#scanImageFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  scanStatus('Leggo il codice nella fotografia…');
  try{
    if(!await loadZXing())throw Error('Connessione richiesta per caricare il lettore');
    const reader=new ZXing.BrowserMultiFormatReader();const url=URL.createObjectURL(file);
    try{const result=await reader.decodeFromImageUrl(url);resolveScan(result.getText())}
    finally{URL.revokeObjectURL(url);reader.reset()}
  }catch(e){scanStatus('Codice non riconosciuto nella foto. Riprova con un’immagine nitida, oppure inserisci il numero sotto il codice.');toast('Codice non trovato nella foto')}
  finally{e.target.value=''}
});
$('#startScan').onclick=startCamera;$('#stopScan').onclick=stopCamera;if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});function updateKind(){const isBook=$('#kind').value==='book';$('#authorWrap').hidden=!isBook;$('#lookupBook').hidden=!isBook;['googleCoverSearchBtn','pasteBookCoverBtn','pasteCoverHelp'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=!isBook})}$('#kind').addEventListener('change',()=>{updateKind();saveDraft()});function saveDraft(){if(!$('#itemName'))return;let data={editId:$('#editId').value,kind:$('#kind').value,itemName:$('#itemName').value,author:$('#author').value,barcode:$('#barcode').value,desc:$('#desc').value,itemPlace:$('#itemPlace').value,value:$('#value').value,photo:photoData};try{localStorage.setItem(DRAFT_KEY,JSON.stringify(data))}catch{toast('Spazio insufficiente: bozza non salvata')}}function restoreDraft(notify=true){let d;try{d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{}if(!d)return;for(let k of ['editId','kind','itemName','author','barcode','desc','itemPlace','value'])if(d[k]!==undefined)$('#'+k).value=d[k];photoData=d.photo||'';if(photoData){$('#photoPreview').src=photoData;$('#photoPreview').hidden=false}updateKind();if(notify)toast('Bozza recuperata 💜')}function updateCodeLookupLabel(){const code=normISBN($('#barcode').value),ean=isEAN(code)&&!/^97[89]/.test(code);if(!isbnLookupBtn.disabled)isbnLookupBtn.textContent=ean?'🔎 Cerca EAN online':'📖 Cerca ISBN online'}
$('#barcode').addEventListener('input',updateCodeLookupLabel);
$('#itemForm').addEventListener('input',saveDraft);$('#itemForm').addEventListener('change',saveDraft);window.addEventListener('pagehide',()=>{if($('#add').classList.contains('active'))saveDraft()});updateKind();renderPlaces();renderStats();page('home');

/* Aggiornamento PWA: conserva archivio e bozze nel localStorage. */
const DLM_VERSION='13';
let dlmUpdateInProgress=false;
let dlmLastUpdateCheck=0;
async function dlmCheckUpdate(showFeedback=false){
  if(dlmUpdateInProgress)return;
  if(!('serviceWorker' in navigator)){if(showFeedback)toast('Aggiornamento non supportato da questo browser');return}
  if(!navigator.onLine){if(showFeedback)toast('Connettiti a Internet per aggiornare');return}
  dlmUpdateInProgress=true;
  const btn=document.getElementById('updateAppBtn');
  if(btn){btn.disabled=true;btn.textContent='↻ Controllo aggiornamenti…'}
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    await registration.update();
    // Aggiorna anche i documenti principali senza eliminare le cache offline.
    const resp=await fetch('./index.html?update='+Date.now(),{cache:'no-store'});
    if(!resp.ok)throw Error('Non raggiungibile');
    const html=await resp.text();
    const match=html.match(/app\.js\?v=([\w.-]+)/);
    const latest=match?match[1]:null;
    if(latest && latest!== 'v'+DLM_VERSION && showFeedback){
      if(showFeedback)toast('Nuova versione trovata: la carico…');
      if(document.querySelector('#add.page.active'))saveDraft();
      const address=new URL(location.href);address.searchParams.set('appv',latest);
      location.replace(address.toString());
      return;
    }
    if(showFeedback)toast('App aggiornata! Versione '+DLM_VERSION+' 💜');
  }catch(error){
    console.warn('Aggiornamento non riuscito',error);
    if(showFeedback)toast('Impossibile controllare gli aggiornamenti. Riprova online.');
  }finally{dlmUpdateInProgress=false;if(btn){btn.disabled=false;btn.textContent='↻ Aggiorna app'}}
}
const dlmUpdateButton=document.getElementById('updateAppBtn');
if(dlmUpdateButton)dlmUpdateButton.addEventListener('click',()=>dlmCheckUpdate(true));
const dlmVersionLabel=document.getElementById('appVersion');
if(dlmVersionLabel)dlmVersionLabel.textContent='Versione '+DLM_VERSION;
// Controllo manuale: evita ricaricamenti spontanei mentre si scorre.
// Il pulsante Aggiorna app resta disponibile quando necessario.


/* Backup locale v07: mai cancellare i dati prima della validazione. */
(function(){
  const exportBtn=document.getElementById('exportArchiveBtn');
  const importBtn=document.getElementById('importArchiveBtn');
  const fileInput=document.getElementById('importArchiveFile');
  const status=document.getElementById('archiveStatus');
  if(!exportBtn||!importBtn||!fileInput)return;
  function report(message){if(status)status.textContent=message;toast(message)}
  function validText(v,max){return typeof v==='string'&&v.length<=max}
  function validateArchive(data){
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Formato backup non valido');
    if(data.format!=='dove-lho-messo-backup'||data.schema!==1)throw Error('File non riconosciuto come backup di Dove l’ho messo?');
    const content=data.archive;
    if(!content||!Array.isArray(content.places)||!Array.isArray(content.items))throw Error('Archivio incompleto');
    if(content.places.length>10000||content.items.length>30000)throw Error('Archivio troppo grande');
    const placeIDs=new Set(),itemIDs=new Set();
    for(const p of content.places){
      if(!p||typeof p!=='object'||!validText(p.id,64)||!/^[a-zA-Z0-9_-]+$/.test(p.id)||placeIDs.has(p.id)||!validText(p.name,1000))throw Error('Posizione non valida o duplicata');
      placeIDs.add(p.id);
    }
    for(const i of content.items){
      if(!i||typeof i!=='object'||!validText(i.id,64)||!/^[a-zA-Z0-9_-]+$/.test(i.id)||itemIDs.has(i.id)||!['book','object'].includes(i.kind)||!validText(i.name,500)||!i.name.trim())throw Error('Oggetto o libro non valido');
      itemIDs.add(i.id);
      for(const prop of ['author','barcode','desc','place','value'])if(i[prop]!=null&&!validText(i[prop],50000))throw Error('Dati non validi in '+prop);
      if(i.photo!=null){if(!validText(i.photo,12000000))throw Error('Foto troppo grande');if(i.photo&&!/^(data:image\/(?:jpeg|png|webp);base64,|https:\/\/)/i.test(i.photo))throw Error('Tipo di foto non supportato')}
    }
    return {places:content.places,items:content.items};
  }
  exportBtn.addEventListener('click',()=>{
    try{
      if(document.getElementById('add')?.classList.contains('active'))saveDraft();
      const data={format:'dove-lho-messo-backup',schema:1,appVersion:DLM_VERSION,exportedAt:new Date().toISOString(),archive:db,draft:localStorage.getItem(DRAFT_KEY)};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='dove-lho-messo-backup-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      report('Backup pronto: salvalo nell’app File e conservalo al sicuro 💜');
    }catch(err){console.error(err);report('Backup non riuscito: controlla lo spazio disponibile')}
  });
  importBtn.addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
    try{
      if(file.size>50000000)throw Error('Il file supera 50 MB');
      const parsed=JSON.parse(await file.text());
      const incoming=validateArchive(parsed);
      const message='Il backup contiene '+incoming.items.length+' oggetti/libri e '+incoming.places.length+' posizioni.\n\nATTENZIONE: il ripristino SOSTITUIRÀ i '+db.items.length+' oggetti/libri e le '+db.places.length+' posizioni attualmente salvati su questo dispositivo.\n\nVuoi continuare?';
      if(!confirm(message)){report('Ripristino annullato: nessun dato modificato');return}
      const previousArchive=localStorage.getItem(KEY),previousDraft=localStorage.getItem(DRAFT_KEY);
      try{
        localStorage.setItem(KEY,JSON.stringify(incoming));
        if(typeof parsed.draft==='string')localStorage.setItem(DRAFT_KEY,parsed.draft);
        else localStorage.removeItem(DRAFT_KEY);
      }catch(error){
        try{if(previousArchive===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,previousArchive);if(previousDraft===null)localStorage.removeItem(DRAFT_KEY);else localStorage.setItem(DRAFT_KEY,previousDraft)}catch{}
        throw Error('Spazio insufficiente: archivio precedente non modificato');
      }
      db=incoming;editing=null;resetForm();renderPlaces();renderItems();renderStats();page('home');
      report('Backup ripristinato! '+incoming.items.length+' oggetti/libri, '+incoming.places.length+' posizioni 💜');
    }catch(error){console.error(error);report('Ripristino non riuscito: '+(error.message||'file non valido'))}
  });
})();


/* v08 — libreria visiva e copertine scelte dall'utente. */
let dlmBookView='grid';
function dlmRenderBooks(){
 const holder=document.getElementById('bookList');if(!holder)return;
 const q=(document.getElementById('bookFilter')?.value||'').toLocaleLowerCase().trim();
 const books=db.items.filter(i=>i.kind==='book'&&[i.name,i.author,i.barcode].some(s=>String(s||'').toLocaleLowerCase().includes(q)));
 holder.classList.toggle('book-list',dlmBookView==='list');
 holder.innerHTML=books.map(i=>`<button type="button" class="book-tile" onclick="showItem('${i.id}')"><span class="book-cover">${i.photo?`<img loading="lazy" src="${safe(i.photo)}" alt="Copertina di ${safe(i.name)}" onerror="this.replaceWith(document.createTextNode('📖'))">`:'📖'}</span><span class="book-text"><strong>${safe(i.name)}</strong><small>${safe(i.author||'Autore da inserire')}</small></span></button>`).join('')||'<div class="empty">Non ci sono libri da mostrare 💜</div>';
 document.getElementById('booksGridBtn')?.setAttribute('aria-pressed',String(dlmBookView==='grid'));
 document.getElementById('booksListBtn')?.setAttribute('aria-pressed',String(dlmBookView==='list'));
}
const dlmOriginalRenderItems=renderItems;
renderItems=function(){dlmOriginalRenderItems();dlmRenderBooks()};
document.getElementById('booksGridBtn')?.addEventListener('click',()=>{dlmBookView='grid';dlmRenderBooks()});
document.getElementById('booksListBtn')?.addEventListener('click',()=>{dlmBookView='list';dlmRenderBooks()});
document.getElementById('bookFilter')?.addEventListener('input',dlmRenderBooks);

let dlmCoverCandidates=[];
async function dlmCheckCoverCandidate(candidate){
 return new Promise(resolve=>{
  const img=new Image();let finished=false;
  const timeout=setTimeout(()=>finish(false),4500);
  function finish(ok){if(finished)return;finished=true;clearTimeout(timeout);img.onload=null;img.onerror=null;resolve({...candidate,valid:ok})}
  img.onload=()=>finish(img.naturalWidth>=70&&img.naturalHeight>=90);
  img.onerror=()=>finish(false);
  img.src=candidate.url;
 });
}
async function dlmSuggestCovers(){
 const target=document.getElementById('coverChoices');const button=document.getElementById('findCoversBtn');
 if(!target||!button)return;
 const isbn=normISBN(document.getElementById('barcode').value);
 const title=document.getElementById('itemName').value.trim();
 if(!checkISBN(isbn)&&!title){toast('Inserisci prima un ISBN o un titolo');return}
 if(!navigator.onLine){toast('Serve Internet per cercare le copertine');return}
 button.disabled=true;target.textContent='Cerco e verifico le copertine…';dlmCoverCandidates=[];
 try{
   const urls=[];
   if(checkISBN(isbn)){
     try{const d=await getCatalogJSON('https://openlibrary.org/isbn/'+encodeURIComponent(isbn)+'.json');for(const id of (d.covers||[]).slice(0,3))urls.push({url:'https://covers.openlibrary.org/b/id/'+id+'-L.jpg?default=false',source:'Open Library · ISBN'})}catch{}
     urls.push({url:'https://covers.openlibrary.org/b/isbn/'+isbn+'-L.jpg?default=false',source:'Open Library · ISBN'});
   }
   try{
     const query=checkISBN(isbn)?'isbn:'+isbn:'intitle:'+title;
     const d=await getCatalogJSON('https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent(query)+'&maxResults=6');
     for(const item of (d.items||[])){
       const v=item.volumeInfo||{};
       if(checkISBN(isbn)&&!exactVolume(v,isbn))continue;
       const url=v.imageLinks?.thumbnail||v.imageLinks?.smallThumbnail;
       if(url)urls.push({url:url.replace(/^http:/,'https:'),source:'Google Books · da verificare'});
     }
   }catch{}
   const unique=[...new Map(urls.map(c=>[c.url,c])).values()].slice(0,8);
   if(!unique.length){target.textContent='Nessuna copertina disponibile. Puoi fotografare quella del tuo libro.';return}
   const results=await Promise.all(unique.map(dlmCheckCoverCandidate));
   dlmCoverCandidates=results;
   const count=results.filter(c=>c.valid).length;
   target.innerHTML='<p class="hint">'+(count?'Confronta le copertine con la tua edizione prima di scegliere.':'Nessuna immagine valida recuperata; puoi usare Scatta foto o Galleria.')+'</p><div class="cover-options">'+results.map((c,n)=>c.valid?`<button class="cover-option" type="button" data-cover-index="${n}"><img src="${safe(c.url)}" alt="Copertina proposta ${n+1}"><small>${safe(c.source)} · Usa questa</small></button>`:`<div class="cover-option cover-unavailable" aria-label="Immagine non disponibile"><span style="display:block;padding:24px 8px;text-align:center">📖<br>Anteprima non disponibile</span><small>${safe(c.source)}</small></div>`).join('')+'</div>';
   // Se il browser perde la connessione dopo il controllo, non nascondere la scheda.
   target.querySelectorAll('button.cover-option img').forEach(img=>img.addEventListener('error',()=>{
      const btn=img.closest('button');if(!btn)return;
      btn.disabled=true;btn.removeAttribute('data-cover-index');
      img.replaceWith(Object.assign(document.createElement('span'),{textContent:'📖 Anteprima non disponibile'}));
      const label=btn.querySelector('small');if(label)label.textContent='Immagine non disponibile';
   }));
 }catch(e){console.warn('Ricerca copertine:',e);target.textContent='Cataloghi momentaneamente non disponibili. Puoi aggiungere la foto manualmente.'}
 finally{button.disabled=false}
}
document.getElementById('findCoversBtn')?.addEventListener('click',dlmSuggestCovers);
document.getElementById('coverChoices')?.addEventListener('click',async e=>{
 const b=e.target.closest('[data-cover-index]');if(!b)return;
 const item=dlmCoverCandidates[Number(b.dataset.coverIndex)];if(!item)return;
 b.disabled=true;toast('Preparo la copertina scelta…');
 const photo=await coverToPhoto(item.url);
 b.disabled=false;
 if(!photo){toast('Non riesco a salvare questa immagine. Prova un’altra o usa Galleria.');return}
 photoData=photo;lastAutoBookCover=photo;
 const preview=document.getElementById('photoPreview');preview.src=photo;preview.hidden=false;
 document.getElementById('coverChoices').innerHTML='<p class="hint">✅ Copertina selezionata. Puoi cambiarla in qualsiasi momento.</p>';
 saveDraft();toast('Copertina aggiunta! 💜');
});

/* Correzione impaginazione libri: separa sempre titolo e autore. */
(()=>{const style=document.createElement('style');style.textContent=`
#bookList .book-tile .book-text{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0;width:100%;}
#bookList .book-tile .book-text strong{display:block;width:100%;line-height:1.3;overflow-wrap:anywhere;}
#bookList .book-tile .book-text small{display:block;width:100%;line-height:1.4;overflow-wrap:anywhere;}
#coverChoices .cover-option{overflow:hidden;min-width:0;}
#coverChoices .cover-unavailable{opacity:.7;border:1px solid #d9bfe9;border-radius:14px;background:#faf7fd;}
#coverChoices .cover-option:disabled{cursor:default;opacity:.7;}
`;document.head.appendChild(style)})();


/* v11: pulsante stabile nell'HTML; nessun aggiornamento automatico. */
(()=>{
  const btn=document.getElementById('googleCoverSearchBtn');
  if(!btn)return;
  const sync=()=>{btn.hidden=document.getElementById('kind')?.value!=='book'};
  document.getElementById('kind')?.addEventListener('change',sync);
  document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>setTimeout(sync,0)));
  btn.addEventListener('click',()=>{
    const title=document.getElementById('itemName')?.value.trim()||'';
    const author=document.getElementById('author')?.value.trim()||'';
    const isbn=normISBN(document.getElementById('barcode')?.value||'');
    const desc=document.getElementById('desc')?.value||'';
    const publisher=(desc.match(/Editore:\s*([^·\n]+)/i)||[])[1]||'';
    if(!title&&!isbn){toast('Inserisci prima il titolo o un ISBN');return}
    saveDraft();
    const terms=[isbn,title,author,publisher,'copertina libro'].filter(Boolean).join(' ');
    // Azione diretta da un tocco dell'utente: funziona anche su Safari iOS.
    const url='https://www.google.com/search?udm=2&q='+encodeURIComponent(terms);
    const opened=window.open(url,'_blank');
    if(!opened)window.location.assign(url);
  });
  sync();
})();


/* v12 - incolla immagine dagli appunti iOS/WebKit, solo con tocco esplicito. */
(()=>{
  const button=document.getElementById('pasteBookCoverBtn');
  const help=document.getElementById('pasteCoverHelp');
  const kind=document.getElementById('kind');
  if(!button||!kind)return;
  const sync=()=>{const isBook=kind.value==='book';button.hidden=!isBook;if(help)help.hidden=!isBook};
  kind.addEventListener('change',sync);
  document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>setTimeout(sync,0)));
  sync();
  button.addEventListener('click',async()=>{
    if(!navigator.clipboard?.read){
      toast('Il tuo browser non consente di incollare immagini: usa Galleria.');return;
    }
    button.disabled=true;
    try{
      // La lettura degli appunti avviene esclusivamente dopo il tocco sul pulsante.
      const entries=await navigator.clipboard.read();
      let imageBlob=null;
      for(const entry of entries){
        const mime=entry.types.find(t=>t.startsWith('image/'));
        if(mime){imageBlob=await entry.getType(mime);break}
      }
      if(!imageBlob){
        toast('Negli appunti non c’è una foto. Copia l’immagine, non il link, oppure usa Galleria.');return;
      }
      if(imageBlob.size>12000000){toast('Immagine troppo grande: usa Galleria.');return}
      const url=URL.createObjectURL(imageBlob);
      try{
        const img=new Image();
        await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
        if(!img.naturalWidth||!img.naturalHeight)throw new Error('Immagine non valida');
        const scale=Math.min(1,720/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        const newPhoto=canvas.toDataURL('image/jpeg',.68);
        // Conserva la foto precedente se il caricamento/convertitore fallisce.
        photoData=newPhoto;
        lastAutoBookCover='';
        const preview=document.getElementById('photoPreview');
        preview.src=newPhoto;preview.hidden=false;
        saveDraft();
        toast('Copertina incollata! Premi Salva per confermare 💜');
      }finally{URL.revokeObjectURL(url)}
    }catch(error){
      console.warn('Incolla copertina:',error);
      toast('Impossibile incollare: autorizza gli appunti o usa Galleria.');
    }finally{button.disabled=false}
  });
})();
