# Arquitetura do Kurio

## Responsabilidades

React 19 apresenta as telas. TanStack Router mantém rotas, filtros e paginação na URL; `PrivateRoute` protege checkout, perfil, carteiras, favoritos e pedidos sem perder o destino durante login. TanStack Query gerencia consultas e mutations; Axios é o cliente HTTP, com adapter fetch: mantém interceptors, timeout e AbortSignal, permitindo controlar os timers de timeout nos testes Playwright. Tailwind v4 e componentes shadcn/Radix usam os tokens e composições de `src/figma.css`.

`src/main.tsx` baixa aplicação e mocks em paralelo e só renderiza após instalar a interceptação. Um estado inicial de carregamento cobre essa espera. O carregamento permite pintar o estado inicial acessível antes de avaliar os módulos de aplicação e mocks. A folha global (~19 kB gzip) é incorporada ao HTML de produção para eliminar uma requisição bloqueante. A folha global é compilada apenas a partir de src/, evitando que relatórios e artefatos acrescentem utilitários desnecessários. Rotas e diálogos são carregados sob demanda. No início mobile, filtros/slider/select e seus diálogos só são baixados ao abrir o drawer; desktop carrega o painel necessário. A ordenação desktop usa import assíncrono. Isso preserva a composição e evita avaliar componentes ocultos durante a primeira pintura. Loaders iniciam prefetch não bloqueante das consultas públicas enquanto os componentes são baixados; useQuery reutiliza a mesma configuração e cache. A versão MSW 2.10.2 foi fixada por compatibilidade com o binding e por reduzir o módulo de mocks de ~174 para ~97 kB gzip. MSW está disponível em desenvolvimento e no build quando `VITE_ENABLE_MSW=true`.

## Contratos REST

Base `/api`, formato JSON padronizado. As interfaces TypeScript estão centralizadas em `src/types/api.ts`. Valores de ETH são trafegados como strings decimais de alta precisão (BigInt em wei); quantidades são inteiros positivos; edições válidas são `1/1`, `1/10`, `1/50` e `ABERTA`; redes suportadas são `Ethereum`, `Polygon` e `Solana`.

### Recursos Mínimos e Operações

| Recurso | Operações |
| --- | --- |
| Sessão e conta | Cadastro, login, consulta da sessão, logout e expiração |
| NFTs | Listagem com busca/filtros/ordenação/paginação e detalhe por identificador |
| Favoritos | Consulta, inclusão e remoção |
| Carrinho | Consulta, inclusão, alteração e remoção de itens |
| Cotação | Validação de cupom, disponibilidade, descontos, taxas e total |
| Pedidos | Criação idempotente e consulta do estado e recibo |
| Perfil | Consulta, atualização de dados/avatar e alteração de senha |
| Carteiras | Consulta, cadastro e atualização (além de remoção e conexão simulada) |

### Endpoints e Assinaturas

| Método e caminho | Entrada / Payload | Resposta de Sucesso | Erros Previstos |
| --- | --- | --- | --- |
| `POST /auth/register` | `{ name, email, password, username? }` | `{ user, token, expiresAt }` (201) | 400 (validação), 409 (e-mail/username em uso) |
| `POST /auth/login` | `{ email, password }` | `{ user, token, expiresAt }` (200) | 400 (validação), 401 (credenciais inválidas) |
| `GET /auth/me` | Nenhum (requer `Authorization: Bearer <token>`) | `{ user, expiresAt }` (200) | 401 (token ausente, inválido ou expirado) |
| `POST /auth/logout` | Nenhum (requer autenticação) | `{ success: true }` (200) | 401 (sessão inválida) |
| `GET /nfts` | Query: `search, collection, network, minPrice, maxPrice, tab, sort, page, limit` | `NFTListResponse` (itens, total, paginação, facetas) (200) | 400 (parâmetros inválidos) |
| `GET /nfts/:id` | Parâmetro `:id` | NFT com preço, versão, estoque total e por edição (200) | 404 (NFT inexistente) |
| `GET /favorites` | Nenhum (requer autenticação) | Array de NFTs favoritos do usuário (200) | 401 (sessão inválida) |
| `POST /favorites/:id` | Parâmetro `:id` (requer autenticação) | Array atualizado de IDs favoritos (200) | 401 (não autenticado), 404 (NFT inexistente) |
| `DELETE /favorites/:id` | Parâmetro `:id` (requer autenticação) | Array atualizado de IDs favoritos (200) | 401 (não autenticado), 404 (NFT inexistente) |
| `GET /cart` | Nenhum (suporta usuário logado ou visitante via cookie/sessão) | `{ items, couponCode?, subtotalEth, discountEth, feeEth, totalEth }` (200) | 500 (falha simulada de leitura) |
| `POST /cart/items` | `{ nftId, edition, quantity }` | Carrinho atualizado (200) | 400 (dados inválidos), 404 (NFT inexistente), 409 (estoque insuficiente) |
| `PATCH /cart/items/:id` | `{ quantity }` | Carrinho atualizado (200) | 400 (quantidade inválida), 404 (linha inexistente), 409 (estoque excedido) |
| `DELETE /cart/items/:id` | Parâmetro `:id` da linha | Carrinho atualizado (200) | 404 (linha inexistente) |
| `POST /cart/adjust-stock` | Nenhum | Carrinho reconciliado com estoque real livre (200) | 500 (falha transitória) |
| `PUT /cart/coupon` | `{ code }` | Carrinho com cupom aplicado e desconto (200) | 400 (cupom inválido ou expirado) |
| `DELETE /cart/coupon` | Nenhum | Carrinho sem cupom (200) | 200 |
| `POST /cart/quote` | `{ items, couponCode?, network? }` | `{ valid, subtotalEth, discountEth, feeEth, totalEth, quoteSignature, warnings, expiresAt }` (200) | 400 (itens inválidos), 409 (conflito de disponibilidade/preço) |
| `POST /orders` | `CreateOrderPayload` + Header `Idempotency-Key: <UUID>` | `{ id, status: 'PENDING', ... }` (202 Accepted) ou snapshot existente (200 OK) | 400 (validação), 401 (não autenticado), 409 (conflito de estoque ou de chave de idempotência com payload divergente), 500 (falha transitória) |
| `GET /orders` | Nenhum (requer autenticação) | Array de pedidos do usuário autenticado (200) | 401 (não autenticado) |
| `GET /orders/by-key/:key` | Parâmetro `:key` de idempotência | Pedido recuperado pertencente ao usuário (200) | 401 (não autenticado), 404 (chave não encontrada) |
| `GET /orders/:id` | Parâmetro `:id` | Snapshot completo e status do pedido (200) | 401 (não autenticado), 404 (inexistente ou pertence a outro usuário) |
| `GET /orders/:id/receipt` | Parâmetro `:id` | `{ orderId, orderNumber, items, receipt, totalEth }` (200) | 401 (não autenticado), 404 (inexistente), 409 (pedido pendente/recusado sem recibo) |
| `GET /profile` | Nenhum (requer autenticação) | Dados do perfil do usuário logado, sem hash de senha (200) | 401 (não autenticado) |
| `PATCH /profile` | `UpdateProfilePayload` (campos parciais + opcional `currentPassword` e `newPassword`) | Usuário atualizado (200) | 400 (dados/senha atual inválidos), 401 (não autenticado) |
| `POST /profile/change-password` | `{ currentPassword, newPassword }` | `{ success: true }` (200) | 400 (senha incorreta ou formato inválido), 401 (não autenticado) |
| `GET /wallets` | Nenhum (requer autenticação) | Lista de carteiras cadastradas do usuário (200) | 401 (não autenticado), 500 (falha simulada) |
| `POST /wallets` | `CreateWalletPayload` (`{ address, network, label, metadata? }`) | Carteira criada (201) | 400 (endereço ou rede inválida), 401 (não autenticado), 409 (carteira duplicada para o usuário) |
| `PATCH /wallets/:id` | `UpdateWalletPayload` | Carteira atualizada (200) | 400 (validação), 401 (não autenticado), 403 (carteira de outro usuário), 404 (inexistente), 409 (conflito de duplicidade) |
| `DELETE /wallets/:id` | Parâmetro `:id` | `{ success: true }` (200) | 401 (não autenticado), 403 (carteira de outro usuário), 404 (inexistente) |
| `POST /wallets/:id/connect` | `{ provider }` | `{ connected: true, walletId, network }` (200) | 401 (não autenticado), 403 (carteira de outro usuário), 404 (inexistente), 409 (recusa simulada da carteira) |
| `POST /wallets/disconnect` | Nenhum | `{ disconnected: true }` (200) | 200 |

### Representação Padronizada de Erros

Todas as respostas de erro HTTP seguem o contrato tipado `ApiErrorResponse` (`src/types/api.ts`):

```json
{
  "message": "Descrição amigável do erro para exibição ao usuário.",
  "fieldErrors": {
    "campo": "Mensagem específica do campo quando aplicável"
  }
}
```

- **HTTP 400 (Bad Request)**: Erros de validação (campos obrigatórios ausentes, endereço de carteira inválido para a blockchain selecionada, senha fora das regras de segurança, quantidades não inteiras).
- **HTTP 401 (Unauthorized)**: Sessão inválida, inexistente ou expirada (token ausente no cabeçalho `Authorization`, token adulterado ou expiração de 24h atingida).
- **HTTP 403 (Forbidden)**: Falta de permissão (tentativa de alterar, conectar ou excluir recursos existentes pertencentes a outro usuário, como carteiras de terceiros).
- **HTTP 404 (Not Found)**: Recurso inexistente (NFT inexistente, linha de carrinho não encontrada, pedido ou carteira não localizados).
- **HTTP 409 (Conflict)**: Conflitos de disponibilidade ou unicidade (estoque insuficiente para a edição solicitada, alteração concorrente de preço sem confirmação, carteira já cadastrada, e-mail/username já em uso ou violação de idempotência).
- **HTTP 500 (Internal Server Error)**: Falhas transitórias no servidor simuladas por cenários de teste (`network-error`, `500-error`, `cart-error`, `wallets-error`), acompanhadas de mensagem clara e ação de retry.

### Idempotência nas Mutações de Pedido

Para garantir que oscilações de rede, reenvios de formulário ou timeouts não dupliquem pedidos e débitos, as mutações de criação de pedido (`POST /orders`) obedecem a regras estritas de idempotência:

1. **Cabeçalho `Idempotency-Key`**: O cliente gera uma chave UUIDv4 persistida no storage local da tentativa da compra (`kurio_last_order_attempt_v2:<userId>`).
2. **Mesma tentativa (Recuperação Idempotente - HTTP 200)**: Quando a API recebe uma requisição com uma `Idempotency-Key` já processada anteriormente e o payload canônico dos dados (itens, edições, quantidades, carteira, rede, totais) é idêntico ao original, a operação não executa nova compra nem reserva novo estoque. Em vez disso, recupera o snapshot do pedido original já registrado e retorna HTTP 200 OK.
3. **Reutilização com conteúdo diferente (Conflito - HTTP 409)**: Se a mesma `Idempotency-Key` for reutilizada com um payload divergente (por exemplo, alteração de itens, de rede ou de endereço de entrega), a API detecta a inconsistência e rejeita imediatamente com HTTP 409 Conflict:
   ```json
   {
     "message": "Conflito de idempotência: a mesma chave foi utilizada com dados diferentes."
   }
   ```
4. **Recuperação transparente (`GET /orders/by-key/:key`)**: Caso a requisição inicial sofra timeout ou a conexão caia antes de receber a resposta HTTP, a aplicação realiza a consulta direta pelo endpoint `GET /orders/by-key/:key` usando a chave da tentativa persistida, recuperando o pedido criado sem gerar nova cobrança.

## Sessão, persistência e cache

O mock mantém estado em memória e `localStorage` (`kurio_mock_database_v2`). Sessões aleatórias duram 24 h, são verificadas a cada acesso privado e revogadas no logout. A chave cliente é `kurio_session_token`. Senhas usam PBKDF2/SHA-256 com salt; nunca retornam pela API. Um 401 limpa sessão/cache e abre autenticação; falhas temporárias oferecem nova tentativa. Trocar usuário desmonta formulários privados e reinicia subscriptions.

A fábrica `src/lib/query-keys.ts` inclui identidade nos recursos privados e os parâmetros no catálogo. O cache padrão fica fresco por 2 minutos, com um retry e sem refetch por foco. A sessão usa 30 s, sem retry automático. Consultas encaminham AbortSignal ao Axios. Pedidos pendentes são reconciliados a cada 2 s. Eventos de NFT invalidam catálogo, detalhe, carrinho, cotações, favoritos, relacionados e sugestões. Invalidações de mutations/socket atualizam consultas ativas; recursos inativos são marcados obsoletos. Favoritos têm atualização otimista com snapshot anterior e rollback em falha.

Logout cancela/remove sessão, favoritos, carrinho, cotações, perfil, carteiras e pedidos do cache. A API verifica identidade e propriedade independentemente da proteção visual. Carrinho visitante é mesclado no login; linhas reais equivalentes somam quantidades. IDs iguais das duas fixtures de demonstração representam a mesma seleção e não são duplicados. Cupom é persistido por carrinho. Preço e estoque das linhas são reconciliados com o catálogo atual.

Requisições privadas são associadas ao token de origem. Respostas de uma sessão encerrada são descartadas antes de alimentar consultas ou mutations; um 401 só expira a sessão à qual a requisição pertence. A atualização otimista de favoritos guarda também usuário/token da operação e ignora callbacks de uma sessão anterior. Logout e troca de identidade limpam os caches de consultas e mutations.

O rascunho do checkout fica no sessionStorage da aba, com chave por usuário, e preserva dados do coletor, observação, carteira, rede e provedor após refresh ou expiração. Uma conta diferente não lê esse rascunho. Confirmação da compra remove o rascunho do comprador; logout explícito e reset removem os rascunhos da aba. Recusa mantém os dados para nova tentativa. Falha na recuperação da sessão oferece retry também no carrinho, sem apresentar loading indefinido.

## Precisão e ciclo do pedido

Cálculos convertem strings para BigInt em wei (18 casas). O sinal pertence ao número inteiro; apresentação preserva as casas significativas. Descontos percentuais arredondam para baixo somente na fração inferior a 1 wei. Não se usa ponto flutuante no subtotal, desconto, taxa ou total. Extremos de facetas são comparados em wei e devolvidos como strings originais. O slider tem resolução de 0,01 ETH; seu editor permite até 18 casas, e o parser de search mantém os valores decimais como strings sem conversão JSON/float.

Taxas simuladas: Ethereum 0,016; Polygon 0,001; Solana 0,002 ETH.

Antes do envio, checkout obtém nova cotação. Preço/estoque/cupom/taxa alterados exigem revisão e novo clique. O mock revalida independentemente e compara assinatura/total quando fornecidos. A mesma chave com o mesmo payload canônico recupera o pedido; conteúdo diferente retorna 409. Chaves e payloads da tentativa são persistidos por usuário em `src/lib/purchase.ts` para recuperação por refresh/timeout.

Criação persiste PENDING e reserva disponibilidade. A resolução normal ocorre após 900 ms (5 s no cenário order-pending), inclusive após refresh, usando prazo persistido e reconciliação REST. CONFIRMED e REJECTED são terminais. Só confirmação desconta estoque e quantidades compradas do carrinho, uma vez. Recusa preserva itens. Recibo e preços são snapshots independentes de futuras mudanças no catálogo. Timeout é simulado **após** persistir o pedido.

Antes de qualquer débito, a resolução revalida a soma das quantidades por NFT e os limites de cada edição, considerando outras reservas. Se o estoque cair durante PENDING e não comportar o pedido completo, ele é recusado sem debitar parcialmente as linhas. A confirmação usa a rede do snapshot também na descrição e no nome do explorador simulado.

## Socket.IO e controles dos mocks

Transporte real do `socket.io-client`: WebSocket na mesma origem, path `/socket.io/`, autenticado com token. MSW intercepta os frames; `@mswjs/socket.io-binding` codifica/decodifica eventos. MSW 2.10.2 e binding 0.2 usam o handshake Engine.IO/Socket.IO do próprio binding; o mock envia heartbeat e autentica a conexão por evento. A versão do Service Worker é a mesma da biblioteca. O cliente é importado depois da interceptação, pois Engine.IO captura o construtor WebSocket no import.

| Evento | Payload |
| --- | --- |
| nft.updated | `{eventId,resourceId,version,priceEth,availableQuantity,editionStock?,timestamp}` |
| order.updated | `{eventId,resourceId,userId,status,version,receipt?,timestamp}` |

Eventos antigos/duplicados são descartados comparando versões já recebidas e carregadas via REST. Pedido terminal não regride. Eventos privados só são emitidos para sessões vigentes do proprietário; cliente também verifica userId. Cada connect/reconnect reconcilia recursos ativos via REST. Listeners são removidos no cleanup; troca de sessão desconecta o socket anterior.

`GET /scenario` consulta o cenário e informa se a sessão concluiu a autenticação Socket.IO, permitindo testes determinísticos. `POST /scenario` recebe `{scenario}`; aliases e comportamentos no README. `POST /reset` restaura fixtures, cancela timers de pedidos e preço, desconecta sockets, invalida sessões, remove todas as tentativas de compra persistidas e avisa o AuthProvider para limpar a sessão/cache sem depender de reload. `POST /scenario/events` aceita:

```js
// Use token de uma sessão válida nos eventos privados.
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('kurio_session_token')}`
}
await fetch('/api/scenario/events', {
  method: 'POST', headers,
  body: JSON.stringify({ type: 'nft.updated', id: 'nft-1', priceEth: '2.19' })
})
```

Outros controles: `availableQuantity:0` esgota o NFT; `replay:true,version:1` emite versão antiga sem alterar REST; `{type:'socket.disconnect',durationMs:900}` interrompe/reconecta; `{type:'session.expire'}` revoga sessão; `{type:'order.resolve',id}` resolve pendência; `{type:'order.replay',id,version:1}` tenta emitir estado antigo. São endpoints de demonstração/teste, ausentes quando MSW está desativado. Eventos percorrem WebSocket; nenhum cenário chama setters React diretamente.

## Figma e decisões de UX

O escopo define comportamento para estados não desenhados. Mercado é o catálogo da tela inicial: leva a `/#catalogo`, limpa filtros e marca o link ativo. Não se inventou uma página de mercado sem referência. Itens editoriais, suporte, ofertas e downloads abrem aviso explícito de indisponibilidade. Busca, favoritos, carrinho, conta, galeria, cupom e pagamento executam seus fluxos previstos. Links de transação informam que a referência é simulada.

O menu mobile tem recorte SVG transparente atrás do botão central, deixando a imagem abaixo aparecer. Login/cadastro têm foco inicial e restauração pelo Radix. Validação usa labels, descrições e alertas; loading usa shimmer e respeita movimento reduzido. Perfil, carteiras e recibo adaptam-se ao mobile mesmo sem frame específico. No pagamento mobile há acesso ao cupom e uma ação para revisar/editar os dados do coletor em diálogo. Filtros mobile usam drawer com foco contido e restauração ao fechar. O catálogo mantém a sequência da API em todos os viewports. Consultas de carrinho e carteiras distinguem erro, carregamento e vazio, com nova tentativa independente.

Diálogos usam um posicionamento central único em relação à viewport, com altura máxima e rolagem interna. Login e cadastro permanecem centralizados no desktop, inclusive quando abertos a partir do catálogo com a página rolada; no mobile a autenticação ocupa a tela inteira.

PNGs originais permanecem locais. WebP lossless foi conferido por igualdade de pixels RGBA. Roboto Mono WOFF2 mantém os mesmos glifos latinos e métricas nos pesos usados (400–700); licença OFL incluída. Não há fonte remota necessária. Valores matematicamente inconsistentes no Figma não são reproduzidos: o total vem da API.

As 15 referências originais (9 desktop e 6 mobile) permanecem em `figma-screens/`. A comparação reproduzível é gerada por `npm run capture:figma`; instruções e evidências estão no README. As baselines são capturas da implementação revisadas pelo agente, ainda sujeitas à revisão humana. Mantêm tolerância de 0,5% e não certificam igualdade pixel a pixel com o Figma.

Diferenças intencionais em relação aos frames:

- O carrinho mobile calcula subtotal 8,14 ETH e total 8,156 ETH para os itens exibidos; a referência mostra subtotal 8,92 ETH, inconsistente com a soma dos preços.
- Nome, perfil, carteiras, transação e data vêm da sessão e do pedido, em vez de texto fixo dos frames. Formulários longos permitem rolagem.
- O catálogo preserva a ordem da API em todos os viewports. A seleção de cards do frame mobile difere da desktop; trocar cards por CSS quebraria a ordenação e a leitura do resultado.
- Cupom e revisão dos dados do coletor acrescentam controles no pagamento mobile, antes das carteiras. São comportamentos obrigatórios sem frame próprio; o botão de confirmação permanece ao fim da tela.
- Foco visível, mensagens associadas aos campos, selects estilizados e retorno nas telas de conta mobile complementam os estados não desenhados. O perfil e as carteiras mobile preservam os campos e operações do desktop.

A suíte visual cobre 390, 414, 768 e 1440 px, com fontes/imagens locais aguardadas e relógio fixado. Apenas o identificador variável do recibo é mascarado nas capturas automatizadas. Os recortes adicionais do menu verificam sua transparência por leitura de pixels. Os skips de navegação correspondem a controles ausentes no viewport, como o menu inferior no desktop e o cabeçalho completo no mobile.

## Limites

É uma simulação local, sem blockchain, gateway, extensão real ou backend seguro. Dados são isolados logicamente por usuário na API; localStorage não é uma fronteira de segurança de produção. Estados são por origem/contexto de navegador, sem sincronização de servidor entre dispositivos ou abas independentes. Socket.IO usa somente WebSocket; não há fallback de long polling. Reset é uma ferramenta de demonstração. Referências e baselines visuais são propostas técnicas e não substituem aprovação humana do design. Condições e resultados Lighthouse ficam nos relatórios, sem remover assets ou mocks para melhorar notas.

As reservas de todos os pedidos PENDING são descontadas tanto do limite total do NFT quanto do limite de cada edição. O ajuste do carrinho distribui esse estoque livre entre as linhas de forma atômica; não confunde duas edições do mesmo NFT. Skeletons reutilizam a geometria final; a cotação usa uma sobreposição no resumo para preservar seu espaço durante atualização.

O aviso de mudança do carrinho acompanha também a versão do NFT retornada pelo REST. Assim, ele continua correto se a reconciliação chegar antes do evento equivalente ou recuperar uma alteração feita durante a desconexão. Não reaplica versões antigas ao cache e reinicia a comparação ao trocar de usuário.

Cabeçalho e carrinho aguardam a recuperação da sessão antes de consultar /cart: a primeira resposta autenticada não é armazenada na chave de visitante. Enquanto a sessão está pendente ou em erro, essas consultas ficam suspensas. A assinatura do carrinho é instalada no commit da interface, antes de exibir os itens, para não perder o evento entre a primeira pintura e o efeito assíncrono.

Se o primeiro evento de uma versão já carregada por REST chegar, o cliente não reaplica seu payload nem repete o aviso: reconcilia os demais caches uma vez. Replays da mesma versão já recebida e versões antigas são descartados. Para reproduzir REST antes de Socket.IO, `nft.updated` aceita `defer:true`; o mock atualiza o banco e guarda um snapshot do evento, entregue por `{type:"nft.flush"}`. Reset e troca de cenário esvaziam a fila. Esses controles não alteram estado React e não criam timers adicionais.
