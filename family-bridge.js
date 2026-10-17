/* Integrazione famiglia - solo sito di prova */
(()=>{
  'use strict';
  const home=document.getElementById('home');
  if(!home)return;
  const panel=document.createElement('section');
  panel.className='panel';
  panel.innerHTML='<h3>🏡 Casa di famiglia</h3><p class="hint"><a href="./family-test.html?v=3">Apri archivio familiare online</a>. Qui puoi verificare gli oggetti salvati su Supabase. La sincronizzazione automatica resta in preparazione.</p>';
  const frame=document.createElement('iframe');frame.src='./family-test.html?v=3';frame.title='Archivio familiare';frame.style.cssText='width:100%;height:680px;border:1px solid #dcc7ee;border-radius:14px';panel.append(frame);home.append(panel);
})();
