# Correções e verificação do Escopo.txt — 16/10/2026

Os defeitos R01–R12 da auditoria anterior foram corrigidos. A execução também identificou e corrigiu a perda do aviso de reconciliação e a consulta do carrinho antes de recuperar a identidade da sessão (R13–R14). As evidências abaixo são das verificações executadas; não representam uma nota percentual ou aprovação humana integral do design.

Aplicação publicada: [https://jungle-gaming-challenge-7uv2w2gbh-feliipenevesnows-projects.vercel.app](https://jungle-gaming-challenge-7uv2w2gbh-feliipenevesnows-projects.vercel.app). Código da aplicação verificado: `a99c936db2fbff599a461484ecbdf27d84089e53`. O envio dos commits ao GitHub ainda aguarda autorização explícita; essa parte da entrega do repositório continua pendente.

A [auditoria anterior às correções](reports/audit-before-fixes.md) foi preservada como histórico. Este documento substitui suas conclusões sobre o estado atual.

## Correções implementadas

| Achado | Resultado no código e na interface |
| --- | --- |
| R01 — ordem mobile | Removida a permuta por posição no CSS. Cards respeitam a ordem retornada pela API, inclusive preço crescente/decrescente e navegação por teclado. |
| R02 — ajuste do estoque | Endpoint `POST /cart/adjust-stock` ajusta todas as linhas atomicamente por NFT e edição, respeitando o limite total livre. |
| R03 — erro no checkout | Falhas de carrinho e carteiras têm mensagens e retry próprios. Erro de consulta não é tratado como recurso vazio. |
| R04 — listagem de carteiras | Skeleton durante carregamento; erro com nova tentativa; vazio apenas depois de resposta válida. |
| R05 — revisão mobile | Resumo do coletor e ação “Revisar dados” abrem formulário acessível no checkout mobile. Erros podem ser corrigidos antes da compra. |
| R06 — reset integral | Cancela timers de pedidos/preço, desconecta sockets, restaura fixtures e remove sessões e tentativas persistidas. AuthProvider limpa cache e estado sem depender de reload. |
| R07 — cupom no carrinho | GET /cart calcula o desconto persistido. Cupom expirado fica identificado, removível e sem desconto; valores e bloqueio refletem a API. |
| R08 — invalidação | Eventos de NFT atualizam também favoritos, sugestões e relacionados. Uma versão já carregada por REST reconcilia os demais caches uma vez, sem reaplicar payload; duplicatas recebidas são descartadas. |
| R09 — reservas agregadas | Pedidos PENDING consomem o estoque total do NFT e o estoque da edição. Duas edições não podem reservar além do total livre. |
| R10 — formulários acessíveis | Labels, `aria-invalid`, descrições de erro e foco de correção foram associados aos campos de checkout, cadastro e carteiras. |
| R11 — carregamento | Skeletons compartilham dimensões com o conteúdo final. Recotação usa sobreposição no resumo e preserva seu espaço; shimmer respeita movimento reduzido. |
| R12 — precisão de preço | Facetas e URL preservam strings exatas de até 18 casas. Editor exato complementa o slider de 0,01 ETH. |
| R13 — reconciliação | Aviso do carrinho acompanha novas versões recebidas por REST, inclusive após perder um frame durante desconexão. A assinatura é instalada antes de exibir os itens. |
| R14 — identidade no refresh | Cabeçalho e carrinho aguardam a recuperação da sessão. A primeira consulta autenticada não usa a chave de cache de visitante. |

Também foram corrigidos a translação duplicada dos diálogos e o padding/borda extras no resumo desktop do carrinho. Filtros e seus controles são carregados sob demanda no início mobile para evitar avaliar componentes ocultos na primeira pintura.

Fontes principais: [handlers MSW](src/mocks/handlers.ts), [banco e estoque](src/mocks/db.ts), [cotação](src/mocks/quote.ts), [carrinho](src/routes/cart.tsx), [checkout](src/routes/checkout.tsx), [carteiras](src/routes/wallets.tsx), [Socket.IO](src/lib/socket.ts), [filtros](src/components/SidebarFilters.tsx) e [estilos](src/figma.css).

## Situação das 12 seções do escopo

| Seção | Evidência e limite da conclusão |
| --- | --- |
| 1 — Escopo | Descoberta, compra e conta funcionam com simulação; estados sem frame seguem a identidade visual. |
| 2 — Stack | React, TypeScript, Router, Query, Axios, REST, Socket.IO, Tailwind, shadcn/Radix, MSW, Playwright e Lighthouse participam da execução. |
| 3 — Telas e fluxos | Rotas previstas, acesso direto, autenticação, carrinho, compra/recibo, perfil e carteiras verificados em desktop/mobile. Mercado aponta para o catálogo; ações fora do escopo têm aviso explícito. |
| 4 — Integração e estado | Chaves por usuário/parâmetros, cancelamento, invalidação, optimistic update/rollback, retry e recuperação preservam os fluxos verificados. |
| 5 — REST | Contratos documentados; validação, sessão, propriedade, inexistência, conflitos e falhas transitórias passam pelos handlers MSW. |
| 6 — Mocking | Cenários configuráveis, persistência/reset e interceptação REST/WebSocket ativos no build publicado. |
| 7 — Tempo real | Cliente Socket.IO real com binding MSW, versões, reconciliação, pedidos terminais e recuperação do mesmo pedido após timeout/reconexão. |
| 8 — Interface | Revisão das referências e regressão em 390, 414, 768 e 1440 px; teclado/foco, labels e skeletons verificados. Fidelidade integral depende de revisão humana; diferenças de dados e adaptações estão documentadas. |
| 9 — Playwright | 90 E2E, 18 de navegação e 16 visuais aprovados; 10 skips previstos para controles ausentes no viewport. Baselines rastreadas no Git local. |
| 10 — Lighthouse | 12 medições do build final; as quatro combinações atendem às quatro categorias exigidas. |
| 11 — Avaliação | Evidências entregues por critério; não se atribui nota ou percentual sem avaliação externa. |
| 12 — Entrega | Fonte, lockfile, assets, mocks, configurações, relatórios, checkout limpo e URL pública disponíveis. Envio do repositório remoto aguarda autorização. |

## Execuções finais

| Verificação | Resultado |
| --- | --- |
| TypeScript e lint | Aprovados; zero warnings de lint |
| Build otimizado | Aprovado, MSW e Socket.IO ativos |
| E2E Chromium desktop/mobile | 90 aprovados, zero falhas/flaky/skips; execução final com 2 workers e retries 0 |
| Navegação/favoritos | 18 aprovados, zero falhas/flaky, 10 skips intencionais por viewport |
| Regressão visual | 16 cenários aprovados em quatro larguras, zero falhas/skips/flaky |
| Produção local | 2 fluxos aprovados: sessão, atualização Socket.IO, nova confirmação, pedido único, recibo após refresh e proteção após logout |
| Checkout limpo | npm ci, build e 2 fluxos de produção aprovados; os 99 arquivos gerados são idênticos aos do build principal |

Relatórios HTML e resumos da execução final: [E2E](reports/playwright/e2e/index.html), [navegação](reports/playwright/navigation/index.html), [visual](reports/playwright/visual/index.html) e [manifesto de verificação](reports/verification.json). Traces de falhas são retidos pelas configurações; um trace anterior à correção foi preservado, identificado como histórico em [reports/README.md](reports/README.md). As rodadas finais não tiveram falhas.

## Cobertura da seção 9

1. Busca, combinação de filtros, sort, botão de paginação, refresh/histórico e sequência visual dos preços: `catalog.spec.ts` e `scope-regressions.spec.ts`.
2. Catálogo→detalhe, IDs diretos, inexistente e metadados antigos: `nft-detail.spec.ts`; o seletor do título identifica o heading de nível 1.
3. Cadastro, conflito, login/logout/troca, refresh, expiração simulada e TTL real: `auth.spec.ts`, `contracts-realtime.spec.ts` e `scope-regressions.spec.ts`.
4. Favoritos, persistência, isolamento, falha/rollback/retry e preço ao vivo: `navigation-actions.spec.ts` e `scope-regressions.spec.ts`.
5. Quantidade, remoção pelo controle visível, cupom, valores, persistência/merge, duas edições e expiração de cupom: `cart.spec.ts` e `scope-regressions.spec.ts`.
6. Compra começa pelo clique real no catálogo e termina no recibo confirmado: `checkout-order.spec.ts`.
7. Recusa, clique repetido, timeout após criação e recuperação da mesma tentativa: `checkout-order.spec.ts` e `contracts-realtime.spec.ts`.
8. Perfil, avatar, senha, carteiras e validação pela UI/API: `profile-wallets.spec.ts`, `auth.spec.ts` e `accessibility-states.spec.ts`.
9. Preço e disponibilidade mudam com checkout aberto: `contracts-realtime.spec.ts` e `scope-regressions.spec.ts`.
10. Replay/versões antigas, desconexão, PENDING, terminal e retomada: `contracts-realtime.spec.ts`; perda de frame com reconciliação: `scope-regressions.spec.ts`.
11. Enter/Escape, Tab/Shift+Tab, ciclo/restauração de foco, seleção por teclado e erros associados: suítes de acessibilidade, auth, navegação e regressões.
12. Lentidão, dimensões do skeleton, falha independente de consultas e nova tentativa: `accessibility-states.spec.ts` e `scope-regressions.spec.ts`.

Os contextos são isolados. Relógio instalado nos fluxos sensíveis, `fastForward`/`setSystemTime` nos cenários temporais; latência e eventos controlados por endpoints MSW. O timeout do Axios usa adapter fetch, mantendo a passagem pelo Axios e permitindo controlar o timer. REST e Socket.IO não são substituídos por setters de UI nos testes.

## Lighthouse do build final

| Perfil/página | Performance | Accessibility | Best Practices | SEO | LCP ms | CLS | TBT ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile `/` | 91 | 98 | 100 | 92 | 3471.8 | 0.00000 | 63.0 |
| mobile `/nfts/nft-1` | 90 | 98 | 100 | 92 | 3602.5 | 0.05151 | 21.0 |
| desktop `/` | 99 | 95 | 100 | 92 | 978.5 | 0.00008 | 0.0 |
| desktop `/nfts/nft-1` | 97 | 100 | 100 | 92 | 909.2 | 0.08780 | 0.0 |

São três medições por combinação, 12 no total. Ambiente, versões, condições e resultados brutos estão em [summary.json](lighthouse-report/summary.json) e nos 24 HTML/JSON da mesma pasta. O script/configuração estão versionados. Imagens, fontes, mocks e funcionalidades permaneceram ativos; não houve suíte de navegador concorrente durante a auditoria.

A primeira rodada desta correção ficou em 89 no início mobile. Carregar os filtros ocultos sob demanda resolveu esse desvio; a tabela apresenta a rodada completa posterior, sem selecionar apenas medições favoráveis. A categoria adicional agentic-browsing não é uma das quatro categorias exigidas pelo enunciado.

SHA-256 do HTML medido, publicado e reproduzido no checkout limpo: `f5509e879a658011e9a8878ab1be7e43be9fcbeeea14ca516d846f92b3aca28b`. Manifesto completo do build: `061c6cea895c440aa015c2287b8288b42ea0cab10a8ee94bdab06d1f3690422c`.

## Revisão visual e publicação

Os 15 PNGs originais do Figma foram preservados. Os diffs foram inspecionados e as 38 baselines técnicas estão rastreadas no Git local, sem ampliar a tolerância. Elas comprovam regressão da implementação, não igualdade pixel a pixel com os PNGs do Figma. [VISUAL-REVIEW.md](VISUAL-REVIEW.md) registra seleção/ordem dos NFTs, conteúdo da sessão, totais matematicamente inconsistentes nos frames e adaptações mobile sem frame próprio.

A Vercel confirmou `Ready`, target `preview`, sem proteção de login. Foi publicado o mesmo pacote estático medido; o acesso direto/refresh é sustentado pela configuração SPA e pelo smoke do mesmo build em localhost. A validação da hospedagem usou CLI/API; não foi executada suíte de navegador contra a URL pública. [DEPLOYMENT.md](DEPLOYMENT.md) e [reports/deployment.json](reports/deployment.json) registram os identificadores.

As verificações descritas são locais. A CI está configurada, mas uma execução remota do GitHub Actions não foi demonstrada. O repositório remoto permanece pendente até a autorização do envio dos commits.
