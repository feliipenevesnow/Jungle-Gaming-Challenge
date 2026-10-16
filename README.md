# Kurio — Jungle Gaming Challenge

Marketplace de NFTs em React 19 e TypeScript, com APIs e pagamentos simulados na camada de rede por MSW. Referências visuais: PNGs originais em `figma-screens/`.

Repositório: https://github.com/feliipenevesnow/Jungle-Gaming-Challenge

Aplicação: https://jungle-gaming-challenge-h6689vu3n-feliipenevesnows-projects.vercel.app

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

Credenciais fictícias: `alex@kurio.art` ou `sofia@kurio.art`, senha **kurio123**. Cadastro cria uma conta independente; senhas são persistidas como PBKDF2 com salt. Uma conta nova precisa cadastrar sua carteira em `/wallets` antes de comprar. Nenhuma extensão ou pagamento real é necessário.

Se a sessão expirar no pagamento, entre novamente na mesma conta para retomar dados do coletor, observação, carteira e rede. O rascunho também sobrevive ao refresh da aba; logout, reset e compra confirmada limpam os dados correspondentes. Falhas temporárias ao recuperar a sessão oferecem nova tentativa sem exigir outro login. Login/cadastro ficam centralizados no desktop e permitem rolagem interna em telas menores.

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

Mercado leva ao catálogo, limpa filtros e marca o destino ativo. Criadores, Aprenda, suporte e outras ações auxiliares abrem um aviso de indisponibilidade. Rotas inexistentes exibem página 404 estilizada com ação de retorno ao início, e qualquer rota prevista suporta acesso direto via URL.

## Política de cache, retries e sincronização

### Cache (TanStack Query)
- **Tempo de expiração (`staleTime`)**: Padrão de 2 minutos (`1000 * 60 * 2`) para dados de catálogo e recursos públicos, garantindo navegação instantânea. Sessão do usuário (`/auth/me`) tem `staleTime: 30s` para monitorar expiração do token. O catálogo utiliza `placeholderData: keepPreviousData` para transições suaves entre filtros e paginação sem flashes.
- **Retenção (`gcTime`)**: 5 minutos de retenção em memória para dados inativos antes de serem liberados pelo coletor.
- **Isolamento de dados por usuário**: Todas as chaves de dados privados (`cart`, `wallets`, `profile`, `favorites`, `orders`, `attempt`) incluem o `userId` (`keys.cart(user.id)`, `keys.wallets(user.id)`). Ao fazer logout ou trocar de conta, `queryClient.cancelQueries()` e `queryClient.removeQueries()` removem todas as chaves privadas do cache em memória e limpam o cache de mutations.
- **Cancelamento e descarte de respostas obsoletas**: Todas as consultas passam o `signal` (`AbortSignal`) do TanStack Query para a instância do Axios (configurada com `adapter: 'fetch'`). Navegações ou alterações rápidas de filtros cancelam a requisição anterior em trânsito. O interceptor de resposta do Axios valida o token com `belongsToPreviousSession()` e descarta respostas de sessões passadas com `CanceledError`.

### Retries e recuperação de falhas
- **Consultas HTTP**: `retry: 1` padrão para tolerar oscilações momentâneas de rede sem sobrecarregar o mock da API.
- **Sessão e recuperação**: `retry: false` para `/auth/me` e `/orders/by-key/:key`, evitando loops em 401 ou 404.
- **Recuperação de falhas sem duplicar operações (Idempotência)**: A criação de pedidos envia o cabeçalho `Idempotency-Key` com chave UUID única persistida em `localStorage`. Se a conexão falhar ou houver timeout durante o envio, a aplicação consulta `/orders/by-key/:key` com a mesma chave, recuperando o pedido criado sem duplicar a compra.
- **Tratamento de erros e retry manual**: Telas com falha exibem feedback contextual claro e botão "Tentar novamente" (`refetch()`).

### Sincronização e atualização otimista
- **Invalidação coerente**:
  - Mutações no carrinho (adicionar, alterar quantidade, remover item, aplicar cupom, ajustar estoque) invalidam simultaneamente `['cart']`, `['cart-quote']` e `['checkout-quote']`.
  - Mutações de carteira invalidam `keys.wallets(user.id)` e `['wallets']`.
  - Atualização de perfil atualiza diretamente o cache `keys.profile(user.id)` e revalida a sessão.
- **Sincronização em tempo real (Socket.IO + Polling)**:
  - Eventos `nft.updated` via WebSocket reconciliam preço, estoque e versão no catálogo, detalhe e carrinho.
  - Eventos `order.updated` atualizam pedidos confirmados ou recusados em tempo real.
  - Pedidos pendentes usam polling a cada 2 s (`refetchInterval: 2000`) como mecanismo de redundância.
  - Controle de versão (`version`) descarta eventos defasados ou duplicados.
- **Atualização otimista com rollback**: Implementada na alternância de favoritos (`src/lib/favorites.ts`):
  - `onMutate`: Cancela queries ativas de favoritos com `client.cancelQueries`, salva snapshot do estado anterior e aplica a alteração no cache otimisticamente via `client.setQueryData`.
  - `onError`: Em caso de falha na requisição, restaura o estado anterior com `client.setQueryData(context.key, context.previous)` e exibe aviso com a reversão.
  - `onSettled`: Invalida a consulta para sincronizar o estado final com o servidor.
- **Feedback visual em segundo plano (Background Updates)**: Barra de sincronização global no topo da aplicação quando `useIsFetching() > 0`, além de badges contextuais de segundo plano em catálogo, carrinho, favoritos, carteiras, perfil e status de pedidos.

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

Eventos controláveis passam por `/api/scenario/events` e pelo transporte Socket.IO; `nft.updated` com `defer:true` atualiza o REST e aguarda `{type:"nft.flush"}` para entregar o snapshot por Socket.IO. Reset/troca de cenário limpam a fila; exemplos e contratos em [ARCHITECTURE.md](ARCHITECTURE.md).

Reset integral dos mocks (apaga os dados simulados desta origem e invalida suas sessões):

```js
await fetch('/api/reset', { method: 'POST' })
// O reset também limpa sessão/cache, timers, sockets, rascunhos e tentativas de compra.
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

Relatórios Playwright gerados: `playwright-report/`, `artifacts/navigation-report/`, `artifacts/visual-report/`. Traces, vídeos e capturas são retidos quando há falhas, e a CI publica esses arquivos como artefatos. Para abrir um relatório, execute `npx playwright show-report <pasta>`.

`npm run capture:figma` exige dev em `127.0.0.1:5174` e gera `artifacts/figma/report.html`, com comparação e sobreposição dos 15 frames originais. Esse HTML contém capturas estáticas; seu link no topo abre a aplicação interativa.

As baselines em `tests/visual-baselines/` são propostas técnicas, sujeitas à revisão humana. Testes visuais verdes demonstram estabilidade em relação a essas baselines, não certificam igualdade pixel a pixel com o Figma. Decisões visuais e desvios estão em [ARCHITECTURE.md](ARCHITECTURE.md#figma-e-decisões-de-ux). Gere e compare snapshots no mesmo ambiente Chromium/Windows, pois a rasterização de fontes pode variar entre sistemas.

## Resultados da entrega

As evidências da execução de 16/10/2026 estão versionadas. Novas execuções geram seus próprios resultados sem substituir automaticamente as evidências entregues.

| Verificação | Resultado | Relatório |
| --- | --- | --- |
| E2E Chromium desktop/mobile | 104 aprovados, sem retries ou testes instáveis | [HTML](reports/playwright/e2e/index.html) |
| Navegação | 18 aprovados; 10 não aplicáveis ao viewport | [HTML](reports/playwright/navigation/index.html) |
| Regressão visual | 16 aprovados em 390, 414, 768 e 1440 px; 38 baselines | [HTML](reports/playwright/visual/index.html) |
| Build de produção | Compra e recuperação aprovadas em desktop/mobile | [Evidências](reports/verification.json) |
| Checkout limpo | `npm ci`, build e compra aprovados; 98 arquivos idênticos | [Evidências](reports/verification.json) |

Medianas Lighthouse, com três medições por página e perfil:

| Perfil / página | Performance | Acessibilidade | Boas práticas | SEO |
| --- | --- | --- | --- | --- |
| Mobile / início | 91 | 98 | 100 | 92 |
| Mobile / detalhe | 90 | 98 | 100 | 92 |
| Desktop / início | 99 | 95 | 100 | 92 |
| Desktop / detalhe | 97 | 100 | 100 | 92 |

Os [resultados Lighthouse](lighthouse-report/summary.json) incluem LCP, CLS, TBT, ambiente e condições; os 12 pares de relatórios HTML/JSON estão na mesma pasta. O [registro consolidado](reports/verification.json) identifica o código validado, a publicação e os testes. O [manifesto do build](reports/build-manifest.json) registra os hashes dos arquivos publicados.

## Publicação

`npm run prepare:deploy` cria um pacote estático em `artifacts/deploy/`, com manifesto SHA-256 de todos os arquivos, e imprime o comando de publicação. `vercel.json` configura build e fallback das rotas SPA, preservando assets e o Service Worker. Configure `VITE_ENABLE_MSW=true` e `VITE_API_BASE_URL=/api` no ambiente de build. O Socket.IO simulado usa a origem publicada. Para hospedagem estática, publique o conteúdo de `dist/` com fallback para `index.html`; mantenha `/mockServiceWorker.js` acessível por HTTPS.

A URL pública no início deste documento corresponde ao build registrado nas evidências. Sua disponibilidade e ausência de proteção por senha foram verificadas pela CLI/API da Vercel; os testes de navegador foram executados no mesmo build em localhost. Contratos, isolamento de sessão e limitações dos mocks estão em [ARCHITECTURE.md](ARCHITECTURE.md).
