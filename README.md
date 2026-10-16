# Kurio — Jungle Gaming Challenge

Marketplace de NFTs em React 19 e TypeScript, com APIs e pagamentos simulados na camada de rede por MSW. Referências: [Escopo.txt](Escopo.txt), [Telas Figma.txt](Telas%20Figma.txt), PNGs originais em `figma-screens/`.

Repositório: https://github.com/feliipenevesnow/Jungle-Gaming-Challenge

Aplicação: https://jungle-gaming-challenge-b02klmsjj-feliipenevesnows-projects.vercel.app

## Executar

Use Node.js 24.19+ e npm. A versão validada está em .nvmrc; o Chromium é instalado pelo Playwright.

```sh
npm ci
cp .env.example .env
npx playwright install chromium
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env` e `npm.cmd`/`npx.cmd` caso a política de execução bloqueie os wrappers `.ps1`. Não há backend externo obrigatório.

| Variável | Valor de demonstração | Uso |
| --- | --- | --- |
| VITE_ENABLE_MSW | true | Ativa REST e WebSocket simulados também no build |
| VITE_API_BASE_URL | /api | Base do Axios |
| VITE_SOCKET_URL | vazio | Servidor Socket.IO quando os mocks estão desativados; com MSW usa a própria origem |
| FIGMA_TOKEN | opcional, sem prefixo VITE_ | Somente scripts de download; assets já estão locais |

Credenciais fictícias: `alex@kurio.art` ou `sofia@kurio.art`, senha **kurio123**. Cadastro cria uma conta independente; senhas são persistidas como PBKDF2 com salt. Uma conta nova precisa cadastrar sua carteira em `/wallets` antes de comprar. Nenhuma extensão ou pagamento real é necessário.

## Rotas e navegação

| Tela | Rota |
| --- | --- |
| Início e Mercado | `/` e `/#catalogo` |
| Detalhe | `/nfts/nft-1` até `/nfts/nft-12` |
| Carrinho | `/cart` |
| Pagamento | `/checkout` |
| Pedido e recibo | `/orders/:id`, criado pela compra |
| Login e cadastro | `/login`, `/cadastro` |
| Perfil, carteiras e favoritos | `/profile`, `/wallets`, `/favorites` |

Mercado leva ao catálogo, limpa filtros e marca o destino ativo. Criadores, Aprenda, suporte e outras ações fora do escopo abrem um aviso de indisponibilidade. O relatório `artifacts/figma/report.html` contém capturas estáticas: o link no topo abre a aplicação interativa.

## Cenários de falha

No console do navegador, com a aplicação aberta:

```js
await fetch('/api/scenario', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'slow-network' })
})
location.reload()
```

| Cenário | Resultado |
| --- | --- |
| default | Latência de 120 ms e confirmação após estado pendente |
| slow-network / latency-high | Latência de 1500 ms e skeletons |
| variable-latency | Busca Emerald demora 700 ms; outras, 80 ms |
| network-error / 500-error | HTTP 500; botão de tentar novamente |
| offline | Erro de conexão MSW |
| cart-error / wallets-error | HTTP 500 apenas na consulta do carrinho ou das carteiras; permite avaliar a recuperação independente |
| session-expired | Próxima requisição autenticada revoga sessão e exige novo login no mesmo fluxo |
| price-changed | Primeira cotação agenda evento Socket.IO com novo preço de nft-1 |
| payment-rejected | Pedido pendente termina recusado; itens preservados |
| timeout-idempotent / timeout | Pedido é criado, mas resposta demora além dos 10 s do Axios; refresh recupera a mesma tentativa |
| order-pending | Pedido demora 5 s; permite exercitar refresh/reconexão |
| wallet-rejected | Conexão de carteira recusada; nenhum pedido criado |

O slider de preço tem resolução de 0,01 ETH. Clique no intervalo exibido para editar valores exatos com até 18 casas; URL e facetas preservam a precisão integral. No celular, os filtros abrem em um drawer e os dados do coletor podem ser revisados no checkout.

Cupom válido: **KURIO10** ou **WELCOME20**. Cupom expirado: **EXPIRED50**; qualquer código desconhecido é inválido. Preços trafegam como strings com até 18 casas; exemplo independente: 1,19 − 0,119 + 0,016 = **1,087 ETH**.

Eventos controláveis passam por `/api/scenario/events` e pelo transporte Socket.IO; exemplos e contratos em [ARCHITECTURE.md](ARCHITECTURE.md).

Reset integral dos mocks (apaga os dados simulados desta origem e invalida suas sessões):

```js
await fetch('/api/reset', { method: 'POST' })
// O reset também limpa sessão/cache, timers, sockets e tentativas de compra.
// Não é necessário recarregar para limpar o estado da aplicação.
location.assign('/')
```

Os testes fazem reset em contextos isolados; não alteram o navegador de uso manual.

## Verificações

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e -- --workers=2 --retries=0
npm run test:navigation
npm run test:visual
npm run test:production
npm run audit:lighthouse
npm run prepare:deploy
```

Execute Lighthouse após o build e sem outras suítes de navegador simultâneas. O script inicia preview em `127.0.0.1:4175`, abre um navegador novo por medição e executa três vezes início/detalhe em mobile/desktop. Relatórios HTML/JSON, medianas, LCP/CLS/TBT e ambiente ficam em `lighthouse-report/`. As metas são 90/95/95/90; o comando falha se uma mediana ficar abaixo delas. `--quick` é apenas diagnóstico de uma medição, não substitui a auditoria completa.

`test:production` inicia preview e verifica login, alteração de preço por Socket.IO, revisão da cotação, pedido único, recibo após refresh e proteção depois do logout em desktop/mobile.

Relatórios Playwright: `playwright-report/`, `artifacts/navigation-report/`, `artifacts/visual-report/`. Traces e capturas de falhas são retidos. `npm run capture:figma` exige dev em `127.0.0.1:5174` e gera comparação com os 15 frames originais.

As baselines em `tests/visual-baselines/` são propostas técnicas, sujeitas à revisão humana. Testes visuais verdes demonstram estabilidade em relação a essas baselines, não certificam igualdade pixel a pixel com o Figma. Detalhes e desvios estão em [VISUAL-REVIEW.md](VISUAL-REVIEW.md).

## Publicação

`npm run prepare:deploy` cria um pacote estático em `artifacts/deploy/`, com manifesto SHA-256 de todos os arquivos, e imprime o comando de publicação. `vercel.json` configura build e fallback das rotas SPA, preservando assets e o Service Worker. Configure `VITE_ENABLE_MSW=true` e `VITE_API_BASE_URL=/api` no ambiente de build. O Socket.IO simulado usa a origem publicada. Para hospedagem estática, publique o conteúdo de `dist/` com fallback para `index.html`; mantenha `/mockServiceWorker.js` acessível por HTTPS.

A evidência atual da revisão e da publicação é registrada em [RELATORIO-AUDITORIA-ESCOPO.md](RELATORIO-AUDITORIA-ESCOPO.md) e [DEPLOYMENT.md](DEPLOYMENT.md). Contratos, isolamento de sessão e limitações dos mocks estão em [ARCHITECTURE.md](ARCHITECTURE.md).
