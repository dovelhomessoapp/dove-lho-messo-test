/* Integrazione famiglia - solo sito di prova */
(()=>{
  'use strict';
  const home=document.getElementById('home');
  if(!home)return;
  const panel=document.createElement('section');
  panel.className='panel';
  panel.innerHTML='<h3>🏡 Casa di famiglia</h3><p class="hint"><a href="./family-test.html?v=3">Apri archivio familiare online</a>. Qui puoi verificare gli oggetti salvati su Supabase. La sincronizzazione automatica resta in preparazione.</p>';
  home.append(panel);
})();
