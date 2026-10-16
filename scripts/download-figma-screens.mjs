import fs from 'node:fs';
import path from 'node:path';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
if (!FIGMA_TOKEN) throw new Error('Defina FIGMA_TOKEN para baixar as referências. A aplicação usa os arquivos locais e não precisa desse token.');
const FILE_KEY = 'Ff0SksUi7UFtPWUO8kyNtw';

// All 15 screens from "Telas Figma.txt"
const screens = [
  // Mobile screens
  { id: '16:1228', name: 'mobile-cadastro.png', title: 'Mobile / Cadastro' },
  { id: '16:1022', name: 'mobile-login.png', title: 'Mobile / Login' },
  { id: '16:748', name: 'mobile-pagamento.png', title: 'Mobile / Pagamento' },
  { id: '16:360', name: 'mobile-carrinho.png', title: 'Mobile / Carrinho de NFTs' },
  { id: '15:5536', name: 'mobile-detalhes.png', title: 'Mobile / Detalhes do NFT' },
  { id: '14:5226', name: 'mobile-inicio.png', title: 'Mobile / Início' },

  // Desktop screens
  { id: '9:1670', name: 'desktop-carteiras.png', title: 'Desktop / Carteiras' },
  { id: '9:1238', name: 'desktop-perfil.png', title: 'Desktop / Perfil do Colecionador' },
  { id: '9:1022', name: 'desktop-cadastro.png', title: 'Desktop / Cadastro' },
  { id: '9:115', name: 'desktop-login.png', title: 'Desktop / Login' },
  { id: '11:4385', name: 'desktop-confirmacao-pedido.png', title: 'Desktop / Confirmação de Pedido' },
  { id: '11:2862', name: 'desktop-pagamento.png', title: 'Desktop / Pagamento' },
  { id: '11:1278', name: 'desktop-carrinho.png', title: 'Desktop / Carrinho de NFTs' },
  { id: '10:244', name: 'desktop-detalhes.png', title: 'Desktop / Detalhes do NFT' },
  { id: '2:2', name: 'desktop-inicio.png', title: 'Desktop / Início' },
];

async function downloadScreens() {
  const outputDir = path.resolve('figma-screens');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Solicitando URLs de exportação para as ${screens.length} telas do Figma...`);
  const ids = screens.map(s => s.id).join(',');
  const apiUrl = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${ids}&format=png&scale=1`;

  const response = await fetch(apiUrl, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do Figma (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const images = data.images || {};

  console.log('Baixando imagens das telas completas para figma-screens/...');

  for (const screen of screens) {
    const imageUrl = images[screen.id];
    if (!imageUrl) {
      console.warn(`⚠️ Não foi encontrada URL para ${screen.title} (ID ${screen.id})`);
      continue;
    }

    const filePath = path.join(outputDir, screen.name);
    console.log(`⬇️ Baixando ${screen.title} (${screen.name})...`);

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`❌ Falha ao baixar ${screen.name}: HTTP ${imgRes.status}`);
      continue;
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Salvo: ${screen.name} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log('\n🎉 Todas as 15 telas do Figma foram baixadas com sucesso na pasta figma-screens/!');
}

downloadScreens().catch(err => {
  console.error('Erro durante o download das telas:', err);
  process.exit(1);
});
