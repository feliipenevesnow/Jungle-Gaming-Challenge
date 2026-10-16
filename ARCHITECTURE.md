# Arquitetura do Kurio

## Responsabilidades

React 19 apresenta as telas. TanStack Router mantém rotas, filtros e paginação na URL; `PrivateRoute` protege checkout, perfil, carteiras, favoritos e pedidos sem perder o destino durante login. TanStack Query gerencia consultas e mutations; Axios é o cliente HTTP, com adapter fetch: mantém interceptors, timeout e AbortSignal, permitindo controlar os timers de timeout nos testes Playwright. Tailwind v4 e componentes shadcn/Radix usam os tokens e composições de `src/figma.css`.

`src/main.tsx` baixa aplicação e mocks em paralelo e só renderiza após instalar a interceptação. Um estado inicial de carregamento cobre essa espera. O carregamento permite pintar o estado inicial acessível antes de avaliar os módulos de aplicação e mocks. A folha global (~19 kB gzip) é incorporada ao HTML de produção para eliminar uma requisição bloqueante. A folha global é compilada apenas a partir de src/, evitando que relatórios e artefatos acrescentem utilitários desnecessários. Rotas e diálogos são carregados sob demanda. No início mobile, filtros/slider/select e seus diálogos só são baixados ao abrir o drawer; desktop carrega o painel necessário. A ordenação desktop usa import assíncrono. Isso preserva a composição e evita avaliar componentes ocultos durante a primeira pintura. Loaders iniciam prefetch não bloqueante das consultas públicas enquanto os componentes são baixados; useQuery reutiliza a mesma configuração e cache. A versão MSW 2.10.2 foi fixada por compatibilidade com o binding e por reduzir o módulo de mocks de ~174 para ~97 kB gzip. MSW está disponível em desenvolvimento e no build quando `VITE_ENABLE_MSW=true`.

## Contratos REST

Base `/api`, JSON. Interfaces em `src/types/api.ts`. Valores ETH são strings decimais; quantidades são inteiros positivos; edições são `1/1`, `1/10`, `1/50`, `ABERTA`; redes são Ethereum, Polygon e Solana.

| Método e caminho | Entrada / resposta |
| --- | --- |
| POST /auth/register | `{name,email,password,username?}` → `{user,token,expiresAt}`, 201; e-mail/username em uso: 409 |
| POST /auth/login | `{email,password}` → mesma sessão; credenciais inválidas: 401 |
| GET /auth/me | `{user,expiresAt}`; exige token vigente |
| POST /auth/logout | Revoga token e conexão de carteira |
| GET /nfts | `search,collection,network,minPrice,maxPrice,tab,sort,page,limit` → `{items,total,page,limit,totalPages,collections,networks,priceRange}` |
| GET /nfts/:id | NFT com preço, versão, estoque total e estoque por edição; 404 se inexistente |
| GET /favorites | Array de NFTs do usuário |
| POST /favorites/:id; DELETE /favorites/:id | Inclusão/remoção; exige autenticação |
| GET /cart | `{items,couponCode?,couponError?,...totais}` do usuário ou visitante; calcula desconto persistido; cupom expirado permanece removível, sem desconto e com cotação inválida |
| POST /cart/items | `{nftId,edition,quantity}`; valida disponibilidade agregada |
| PATCH /cart/items/:id | `{quantity}`; valida inteiro, edição e estoque |
| DELETE /cart/items/:id | Remove linha do carrinho atual |
| POST /cart/adjust-stock | Ajusta atomicamente todas as linhas ao estoque livre por NFT e edição, descontando reservas pendentes |
| PUT /cart/coupon; DELETE /cart/coupon | `{code}` para aplicar; DELETE para remover |
| POST /cart/quote | `{items:[{nftId,edition,quantity}],couponCode?,network?}` → validade, linhas/preços/versões, subtotal, desconto, taxa, total, avisos |
| POST /orders | `CreateOrderPayload` + `Idempotency-Key`; retorna PENDING (202) ou snapshot existente (200) |
| GET /orders | Array de pedidos do usuário |
| GET /orders/by-key/:key | Recupera tentativa pertencente ao usuário |
| GET /orders/:id | Snapshot e estado; 404 para ID inexistente ou de outra conta |
| GET /orders/:id/receipt | `{orderId,orderNumber,items,receipt,totalEth}` somente se CONFIRMED; 409 enquanto indisponível |
| GET /profile | Dados públicos do próprio usuário, sem hash |
| PATCH /profile | Nome, username, bio, avatarUrl, ensName, walletNickname; senha opcional com currentPassword/newPassword validadas atomicamente |
| POST /profile/change-password | `{currentPassword,newPassword}` |
| GET /wallets | Carteiras do usuário |
| POST /wallets | `{address,network,label,metadata?}`; 201 |
| PATCH /wallets/:id | Endereço, rede, rótulo, principal e metadados |
| DELETE /wallets/:id | Remove carteira própria; promove outra se necessário |
| POST /wallets/:id/connect | `{provider}` → `{connected,walletId,network}` ou recusa simulada |
| POST /wallets/disconnect | Encerra conexão simulada |

Erros usam `{message,fieldErrors?}`. 400: validação; 401: sessão inválida; 404: recurso não encontrado ou pertencente a outra conta; 409: conflito/estoque/cotação/idempotência; 500: falha transitória simulada. Carteiras Ethereum/Polygon aceitam endereço hexadecimal de 40 dígitos ou ENS; Solana usa formato base58 de 32–44 caracteres. Essa validação de formato não consulta blockchain.

O payload de pedido contém itens, rede, carteira, cupom, `expectedTotalEth`, `quoteSignature`, observação e dados do coletor. Campos obrigatórios do layout são validados também no mock. Uma carteira cadastrada deve estar conectada no servidor simulado.

## Sessão, persistência e cache

O mock mantém estado em memória e `localStorage` (`kurio_mock_database_v2`). Sessões aleatórias duram 24 h, são verificadas a cada acesso privado e revogadas no logout. A chave cliente é `kurio_session_token`. Senhas usam PBKDF2/SHA-256 com salt; nunca retornam pela API. Um 401 limpa sessão/cache e abre autenticação; falhas temporárias oferecem nova tentativa. Trocar usuário desmonta formulários privados e reinicia subscriptions.

A fábrica `src/lib/query-keys.ts` inclui identidade nos recursos privados e os parâmetros no catálogo. O cache padrão fica fresco por 2 minutos, com um retry e sem refetch por foco. A sessão usa 30 s, sem retry automático. Consultas encaminham AbortSignal ao Axios. Pedidos pendentes são reconciliados a cada 2 s. Eventos de NFT invalidam catálogo, detalhe, carrinho, cotações, favoritos, relacionados e sugestões. Invalidações de mutations/socket atualizam consultas ativas; recursos inativos são marcados obsoletos. Favoritos têm atualização otimista com snapshot anterior e rollback em falha.

Logout cancela/remove sessão, favoritos, carrinho, cotações, perfil, carteiras e pedidos do cache. A API verifica identidade e propriedade independentemente da proteção visual. Carrinho visitante é mesclado no login; linhas reais equivalentes somam quantidades. IDs iguais das duas fixtures de demonstração representam a mesma seleção e não são duplicados. Cupom é persistido por carrinho. Preço e estoque das linhas são reconciliados com o catálogo atual.

## Precisão e ciclo do pedido

Cálculos convertem strings para BigInt em wei (18 casas). O sinal pertence ao número inteiro; apresentação preserva as casas significativas. Descontos percentuais arredondam para baixo somente na fração inferior a 1 wei. Não se usa ponto flutuante no subtotal, desconto, taxa ou total. Extremos de facetas são comparados em wei e devolvidos como strings originais. O slider tem resolução de 0,01 ETH; seu editor permite até 18 casas, e o parser de search mantém os valores decimais como strings sem conversão JSON/float.

Taxas simuladas: Ethereum 0,016; Polygon 0,001; Solana 0,002 ETH.

Antes do envio, checkout obtém nova cotação. Preço/estoque/cupom/taxa alterados exigem revisão e novo clique. O mock revalida independentemente e compara assinatura/total quando fornecidos. A mesma chave com o mesmo payload canônico recupera o pedido; conteúdo diferente retorna 409. Chaves e payloads da tentativa são persistidos por usuário em `src/lib/purchase.ts` para recuperação por refresh/timeout.

Criação persiste PENDING e reserva disponibilidade. A resolução normal ocorre após 900 ms (5 s no cenário order-pending), inclusive após refresh, usando prazo persistido e reconciliação REST. CONFIRMED e REJECTED são terminais. Só confirmação desconta estoque e quantidades compradas do carrinho, uma vez. Recusa preserva itens. Recibo e preços são snapshots independentes de futuras mudanças no catálogo. Timeout é simulado **após** persistir o pedido.

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
