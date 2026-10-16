import { readdir, writeFile } from 'node:fs/promises'

// Run after capture-figma.mjs. Keep the approved Figma files untouched.
const frames = (await readdir('figma-screens')).filter(name => name.endsWith('.png')).map(name => {
  const mobile = name.startsWith('mobile-')
  const screen = name.replace(/^(mobile|desktop)-/, '').replace('.png', '')
  return { name, width: mobile ? 414 : 1440, actual: `${mobile ? 414 : 1440}-${screen}.png` }
})
await writeFile('artifacts/figma/report.html', `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kurio — comparação com Figma</title>
<style>
*{box-sizing:border-box}body{margin:0;font:15px system-ui;background:#181818;color:#eee}header{position:sticky;top:0;z-index:2;padding:18px 24px;background:#252525;border-bottom:1px solid #555}h1{font-size:20px;margin:0 0 12px}p{margin:8px 0;color:#ccc}label{display:inline-flex;gap:10px;align-items:center;margin:8px 20px 0 0}select,button{font:inherit;padding:8px;background:#111;color:#eee;border:1px solid #888;border-radius:4px}main{padding:24px;overflow:auto}.pair{display:flex;gap:24px;align-items:flex-start;width:max-content}figure{margin:0;width:var(--width);flex-shrink:0}figcaption{height:32px}img{display:block;width:100%;height:auto}a{color:#edb479}.overlay{position:relative;width:var(--width)}.overlay img+img{position:absolute;inset:0;opacity:var(--opacity,.5)}[hidden]{display:none!important}.note{max-width:1000px;font-size:13px}
</style>
<header><h1>Kurio — Figma × implementação</h1>
<p><strong>Relatório de imagens estáticas:</strong> os botões dentro das capturas não são clicáveis. <a id="live-app" href="http://localhost:5173/" target="_blank" rel="noopener">Abrir aplicação interativa</a></p>
<p>15 referências originais. Compare lado a lado ou sobreponha as imagens, alinhadas pelo canto superior esquerdo.</p>
<label>Tela <select id="frame"></select></label>
<label>Visualização <select id="mode"><option value="pair">Lado a lado</option><option value="overlay">Sobreposição</option></select></label>
<label>Escala <select id="scale"><option value=".5">50%</option><option value=".75">75%</option><option value="1">100%</option></select></label>
<label>Opacidade da implementação <input id="opacity" type="range" min="0" max="100" value="50"></label>
<p class="note">Os dados são da API mock: perfil preenchido, identificadores e carteira seguem a sessão. No carrinho mobile, os itens somam 8,14 ETH; o subtotal de 8,92 ETH do Figma é inconsistente. O total calculado é 8,156 ETH. Telas desktop de conteúdo podem ter altura diferente do canvas do Figma. As capturas documentam o resultado e não representam certificação de igualdade pixel a pixel.</p>
</header>
<main><div class="pair" id="pair"><figure><figcaption><a id="reference-link">Referência Figma</a></figcaption><img id="reference" alt="Referência exportada do Figma"></figure><figure><figcaption><a id="actual-link">Implementação</a></figcaption><img id="actual" alt="Captura da implementação"></figure></div><div class="overlay" id="overlay" hidden><img id="overlay-reference" alt="Referência"><img id="overlay-actual" alt="Implementação sobreposta"></div></main>
<script>
const frames=${JSON.stringify(frames)};
const $=id=>document.getElementById(id);
if(location.protocol !== 'file:') $('live-app').href=new URL('/',location.href).href;
for(const frame of frames){const option=document.createElement('option');option.value=frame.name;option.textContent=frame.name; $('frame').append(option)}
$('frame').value='mobile-inicio.png';
function render(){const frame=frames.find(f=>f.name===$('frame').value);const original='../../figma-screens/'+frame.name;document.documentElement.style.setProperty('--width',frame.width*Number($('scale').value)+'px');document.documentElement.style.setProperty('--opacity',$('opacity').value/100);$('reference').src=$('overlay-reference').src=$('reference-link').href=original;$('actual').src=$('overlay-actual').src=$('actual-link').href=frame.actual;$('pair').hidden=$('mode').value!=='pair';$('overlay').hidden=$('mode').value!=='overlay'}
for(const id of ['frame','mode','scale','opacity'])$(id).addEventListener('input',render);render();
</script></html>`, 'utf8')
console.log('Comparação: artifacts/figma/report.html')
