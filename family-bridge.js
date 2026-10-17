/* Integrazione famiglia - solo sito di prova */
(()=>{
  'use strict';
  const home=document.getElementById('home');
  if(!home)return;
  const panel=document.createElement('section');
  panel.className='panel';
  panel.innerHTML='<h3>🏡 Casa di famiglia</h3><p class="hint">Accesso e sincronizzazione in preparazione.</p>';
  home.append(panel);
})();
