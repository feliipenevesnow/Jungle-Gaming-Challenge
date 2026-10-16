> Documento histórico anterior às correções. Consulte [o relatório atual](../RELATORIO-AUDITORIA-ESCOPO.md).

# Auditoria completa do escopo — estado verificado em 16/10/2026

Esta revisão substitui a conclusão anterior de “98% em conformidade”. Não há uma metodologia demonstrada que sustente aquele percentual. O escopo contém critérios ponderados, dependentes da avaliação da implementação e das evidências; contar testes aprovados não produz uma nota de conformidade.

Foram lidas todas as 12 seções do `Escopo.txt`, as rotas e componentes relacionados, contratos, handlers MSW, regras do banco simulado, sessão, cliente Socket.IO, testes/configurações, documentação e artefatos locais. Esta revisão **não executou testes, Lighthouse, build, deploy ou novos fluxos no navegador**, respeitando a orientação anterior de não executar suítes. O código da aplicação não foi alterado nesta revisão. A versão anterior deste documento foi preservada em `artifacts/audit/RELATORIO-AUDITORIA-ESCOPO-anterior-a-revisao-completa.md`.

Terminologia:

- **Defeito identificado no código:** o caminho que produz a inconsistência está explícito na implementação; não significa reprodução nova no navegador.
- **Pendência comprovada por artefato:** resultado ou ausência verificada nos arquivos/Git locais.
- **Cobertura parcial / não comprovado:** há implementação ou testes relacionados, mas a evidência disponível não basta para aprovar integralmente o requisito. Não é declaração automática de defeito em execução.

## 1. Evidência disponível

| Suíte | Início da execução registrada (UTC) | Resultado extraído do HTML |
| --- | --- | --- |
| E2E desktop/mobile | 2026-10-16T13:55:59.560000+00:00 | 54 aprovados; 0 falhas; 0 ignorados; 0 flaky |
| Navegação | 2026-10-16T14:00:42.540000+00:00 | 18 aprovados; 0 falhas; 10 ignorados; 0 flaky |
| Visual | 2026-10-16T14:01:30.921000+00:00 | 7 aprovados; 9 falhas; 0 ignorados; 0 flaky |

Fontes: [E2E](playwright-report/index.html), [navegação](artifacts/navigation-report/index.html), [visual](artifacts/visual-report/index.html). Foram inspecionados os dados JSON compactados dentro dos relatórios HTML, além de `.last-run.json`. Não se trata de resultados de uma nova execução desta auditoria. Os 54 E2E não incluem os testes de favoritos da suíte separada de navegação.

Existem 38 PNGs em `tests/visual-baselines/`. `git ls-files` retorna vazio e `git log -1` informa que a branch local ainda não tem commits. Portanto, as baselines, a configuração Lighthouse e o código **não estão versionados no Git local**. O remoto configurado aponta para `https://github.com/feliipenevesnow/Jungle-Gaming-Challenge`; a existência dessa configuração não comprova publicação do código remoto. O conteúdo remoto não foi consultado nesta revisão.

## 2. Situação das 12 seções

| Seção | Situação sustentada pela revisão | O que falta ou limita a aprovação |
| --- | --- | --- |
| 1. Escopo | Fluxos centrais presentes, com simulação local | Fidelidade integral ao Figma não demonstrada; falhas e lacunas abaixo |
| 2. Stack obrigatória | Uso efetivo identificado de todas as tecnologias listadas | Não foi identificada tecnologia obrigatória ausente; não confundir isso com aprovação dos comportamentos |
| 3. Telas e fluxos | Rotas previstas e versões responsivas presentes | Ordenação visual mobile, ajuste por edição, estados de falha no checkout, revisão dos dados do coletor no mobile e consistência dos totais do carrinho |
| 4. Integração e estado | Router, Query, Axios, cancelamento, chaves por usuário e rollback presentes | Falhas/vazio/carregamento confundidos em consultas; caches auxiliares não acompanham todos os eventos |
| 5. Contratos REST | Operações mínimas e contratos documentados presentes | GET do carrinho não calcula desconto do cupom persistido; verificar o limite da reserva agregada entre edições descrito em R09 |
| 6. MSW | Interceptação REST/WebSocket e cenários configuráveis presentes | Reset não limpa toda a tentativa de compra nem cancela o timer de alteração de preço |
| 7. Socket.IO | Cliente real, binding MSW, versão, isolamento e reconciliação presentes | Algumas listas auxiliares ficam com dados antigos; cobertura temporal precisa de reforço |
| 8. Interface e acessibilidade | Assets locais, responsividade, Radix e feedback presentes | Diffs visuais pendentes, associação incompleta de erros/labels, skeletons com geometria diferente e ausência de validação de zoom |
| 9. Playwright | 54 E2E e 18 verificações de navegação aprovados nos relatórios | 9 falhas visuais; baselines sem versionamento; relógio e verificações de comportamento incompletos |
| 10. Lighthouse | 12 medições e relatórios HTML/JSON existem | Medições correspondem a um HTML diferente do build atual; configuração não versionada |
| 11. Critérios | Não é possível atribuir uma nota fundamentada nesta revisão | Nenhum dos defeitos eliminatórios foi comprovado aqui; publicação e requisitos incompletos continuam impedindo concluir a entrega |
| 12. Entrega | Código, lockfile, assets, mocks, scripts e documentação locais presentes | URL pública não comprovada; código sem commit local; pacote de deploy e documentos de status desatualizados; checkout limpo não demonstrado |

## 3. Defeitos e funcionalidades parciais identificados no código

### R01 — A ordem visual do catálogo mobile ignora a ordenação da API

Prioridade: **Alta**. Requisitos: Seções 3 e 8.

Evidência: [src/figma.css:2655](src/figma.css#L2655).

No media query mobile, o sétimo card recebe `order:4`, enquanto o quarto recebe `order:5`. A regra vale também com `sort=price_asc` ou `price_desc`. Assim, uma resposta corretamente ordenada pode ser mostrada como 1º, 2º, 3º, 7º, 4º…; a ordem visual também diverge da ordem de leitura/foco do DOM.

O que falta: Preservar a sequência do resultado da API. Ajustar o conteúdo/seleção do destaque conforme o design sem reordenar itens arbitrariamente por posição no CSS. Verificar preços e posições visuais após ordenar.

### R02 — Ajustar quantidades ao estoque pode usar a edição errada

Prioridade: **Alta**. Requisitos: Seções 3, 4 e 5.

Evidência: [src/routes/cart.tsx:85](src/routes/cart.tsx#L85).

A busca usa somente `nftId`. Se o mesmo NFT estiver em duas edições, a segunda linha usa o `currentStock` da primeira. Uma edição com limite 4 pode ser tratada como se tivesse o estoque maior de outra edição, mantendo o checkout bloqueado ou enviando ajuste inválido.

O que falta: Identificar a linha por NFT e edição, usando também o limite agregado por NFT quando necessário.

### R03 — Checkout confunde falha de consulta com carrinho vazio ou ausência de carteiras

Prioridade: **Alta**. Requisitos: Seções 3, 4 e 8.

Evidência: [src/routes/checkout.tsx:50](src/routes/checkout.tsx#L50); [src/routes/checkout.tsx:59](src/routes/checkout.tsx#L59).

Os erros das consultas de carrinho e carteiras não são lidos. Sem cache, uma falha em GET /cart resulta em `cartItems=[]` e pode exibir “Seu carrinho está vazio”. Falha em GET /wallets resulta em `wallets=[]` e sugere cadastrar uma carteira já existente. O tratamento de erro da cotação não cobre essas consultas.

O que falta: Separar carregamento, erro com nova tentativa, vazio real e dados existentes em cada consulta. Não inferir ausência de recursos a partir de requisição malsucedida.

### R04 — Tela de carteiras não apresenta carregamento nem erro da listagem

Prioridade: **Média**. Requisitos: Seções 3, 4 e 8.

Evidência: [src/routes/wallets.tsx:51](src/routes/wallets.tsx#L51).

A consulta só extrai `data`. Há feedback de mutations, mas não de falha/lentidão em GET /wallets. A lista vazia e o texto de ausência de carteira secundária podem aparecer sem que a API tenha concluído com sucesso.

O que falta: Exibir skeleton/estado ocupado, erro com retry e vazio somente depois de uma resposta válida.

### R05 — Dados do coletor não podem ser revisados ou corrigidos no checkout mobile

Prioridade: **Média**. Estado: **funcionalidade parcial**. Requisitos: Seção 3.

Evidência: [src/figma.css:2333](src/figma.css#L2333); [src/routes/checkout.tsx:137](src/routes/checkout.tsx#L137).

Abaixo de 768 px, `.collector-form` fica com `display:none`, mas seus estados continuam sendo enviados e validados. O usuário mobile pode escolher a carteira, porém não dispõe no checkout de revisão/edição dos dados do coletor, observação ou mensagens junto a esses campos. O frame mobile não desenhar o formulário não dispensa o comportamento obrigatório; o escopo prevê estados não desenhados no mesmo padrão visual.

O que falta: Oferecer um resumo acessível com ação de editar os dados, mantendo a composição do frame principal. Validar e permitir corrigir qualquer campo obrigatório também no mobile.

### R06 — Reset não restaura integralmente o cenário de compra

Prioridade: **Alta**. Requisitos: Seções 6 e 12.

Evidência: [src/mocks/handlers.ts:56](src/mocks/handlers.ts#L56); [src/mocks/handlers.ts:246](src/mocks/handlers.ts#L246); [src/lib/purchase.ts:4](src/lib/purchase.ts#L4).

O reset cancela timers de pedido e restaura o banco, mas não cancela o timer de 700 ms do cenário `price-changed`. Esse timer pode alterar o banco recém-restaurado caso não haja navegação que encerre o contexto. Também permanecem chaves `kurio_purchase_attempt:<userId>`. Após reset e novo login do mesmo usuário seed, o checkout lê a tentativa antiga, recebe 404 na recuperação e mantém o payload antigo para reenvio. A receita de reset do README remove o token, mas não essas tentativas.

O que falta: Cancelar todos os timers dos cenários; limpar tentativas do ambiente restaurado e conexões/estado transitório pertinentes. Tratar recuperação inexistente para não reapresentar tentativa removida por reset.

### R07 — GET /cart devolve totais sem considerar o cupom aplicado

Prioridade: **Média**. Requisitos: Seções 3, 4, 5 e 6.

Evidência: [src/mocks/handlers.ts:209](src/mocks/handlers.ts#L209); [src/mocks/handlers.ts:211](src/mocks/handlers.ts#L211).

O handler lê `couponCode`, mas chama `calculateQuote(selected, "Ethereum")` sem passá-lo. Uma resposta pode incluir `couponCode:"KURIO10"` e, ao mesmo tempo, desconto zero e total sem desconto. POST /cart/quote calcula corretamente o desconto, e normalmente alimenta a UI final; isso não corrige a inconsistência entre as respostas REST ou seus fallbacks.

O que falta: Fazer o contrato do carrinho refletir o cupom persistido, com política explícita para cupom que expirou depois da aplicação.

### R08 — Listas auxiliares não acompanham a atualização de NFTs

Prioridade: **Média**. Requisitos: Seções 4 e 7.

Evidência: [src/lib/socket.ts:48](src/lib/socket.ts#L48); [src/routes/cart.tsx:116](src/routes/cart.tsx#L116); [src/routes/nfts.$id.tsx:104](src/routes/nfts.$id.tsx#L104).

O evento invalida as famílias nfts/nft/cart/cotações. As listas `suggested-nfts`, `related-nfts` e o cache de `favorites` também guardam NFTs completos, mas não são atualizados/invalidados por esse evento. Catálogo principal e linhas do carrinho podem mostrar preço novo enquanto cards auxiliares mantêm o antigo até outro refetch.

O que falta: Unificar as famílias de query keys ou atualizar/invalidar todos os caches que representam o NFT alterado.

### R09 — A cotação não aplica a reserva total de pendentes à soma entre edições

Prioridade: **Média**. Requisitos: Seções 3, 5 e 7.

Evidência: [src/mocks/quote.ts:16](src/mocks/quote.ts#L16); [src/mocks/db.ts:624](src/mocks/db.ts#L624).

A soma das quantidades do NFT é comparada com `nft.availableQuantity` bruto. Já cada edição é comparada isoladamente com `availableStock`, que desconta as reservas pendentes. Exemplo lógico: estoque total 5, outro pedido reserva 3, duas edições novas pedem 2+2. Cada linha pode passar no limite restante 2, e a soma 4 passa em 5, embora sobrem apenas 2 unidades. A resolução pode recusar um pedido posterior, mas a cotação/reserva aceita mais do que o disponível livre.

O que falta: Comparar a soma entre edições com o estoque total livre de reservas. A evidência aqui é a leitura das condições e esse contraexemplo aritmético; não houve reprodução nova.

### R10 — Associação acessível de campos e erros está incompleta

Prioridade: **Média**. Requisitos: Seção 8.

Evidência: [src/routes/checkout.tsx:351](src/routes/checkout.tsx#L351); [src/routes/wallets.tsx:256](src/routes/wallets.tsx#L256); [src/components/AuthModal.tsx:190](src/components/AuthModal.tsx#L190).

No checkout, “Nome ENS” usa label sem htmlFor e Input sem id/aria-label. Os erros gerais de pagamento não são associados aos campos. Em carteiras, somente o endereço aponta para `wallet-error`, mesmo quando o erro é de nome, indicação ou ENS. No cadastro, a confirmação de senha não referencia `auth-error`. Há uso de labels/alertas em outros pontos; a lacuna é de cobertura consistente dos campos afetados.

O que falta: Associar labels, identificar os campos inválidos e vincular suas mensagens; manter um resumo de erro acessível quando adequado.

### R11 — Skeletons não preservam toda a geometria e faltam no checkout

Prioridade: **Média**. Requisitos: Seções 4 e 8.

Evidência: [src/components/NFTSkeleton.tsx:18](src/components/NFTSkeleton.tsx#L18); [src/components/HomePage.tsx:240](src/components/HomePage.tsx#L240); [src/routes/cart.tsx:300](src/routes/cart.tsx#L300).

O catálogo carrega seis skeletons para uma página com nove NFTs. O skeleton inclui uma área de botão que o card final não tem no fluxo normal e não usa a composição mobile `.nft-card/.nft-art`. O resumo do carrinho adiciona o skeleton acima dos totais, em vez de substituir a mesma área. No checkout não há skeleton para carrinho/carteiras/cotação. A tela de pedido usa animate-pulse em vez do shimmer empregado nas demais views; a regra reduzida atual só desativa skeleton-shimmer e o toast.

O que falta: Reutilizar os contêineres e dimensões finais e substituir conteúdo durante loading. Tratar movimento reduzido em todos os loaders. Medir os deslocamentos nos cenários lentos; esta auditoria não produziu nova medição de CLS.

### R12 — Filtros de preço e facetas reduzem precisão para duas casas

Prioridade: **Parcial**. Requisitos: Seções 3 e 5.

Evidência: [src/mocks/handlers.ts:138](src/mocks/handlers.ts#L138); [src/components/SidebarFilters.tsx:50](src/components/SidebarFilters.tsx#L50).

As operações financeiras centrais usam wei/BigInt corretamente. Porém a faixa mínima/máxima da API converte o preço em float e aplica toFixed(2); o filtro de faixa também reenvia somente duas casas. Um preço de 1 wei continua íntegro no NFT e na cotação, mas sua faceta vira "0.00". Isso limita a precisão declarada de até 18 casas no catálogo. Não implica erro no cálculo da cobrança nem exige que o slider tenha passos de 1 wei; falta preservar os extremos exatos no contrato e explicitar a resolução da interação.

O que falta: Calcular extremos com strings/wei e definir/documentar a resolução de interação do slider sem destruir parâmetros precisos recebidos pela URL.

## 4. Testes: lacunas verificadas na seção 9

Os 12 assuntos aparecem na combinação das suítes, mas “aparece em um teste” e “comportamento integralmente comprovado” são estados diferentes.

| Item | Evidência presente | Pendência concreta |
| --- | --- | --- |
| 1. Busca/filtros/ordenação/paginação/histórico | `tests/e2e/catalog.spec.ts` combina filtros, muda sort, restaura URL e navega no histórico | Não compara os preços em ordem, nem a ordem visual; paginação é preparada por `/?page=2`, sem exercitar o botão de página. Não detecta R01 |
| 2. Detalhe direto/inexistente | `nft-detail.spec.ts`: acesso pelo catálogo, IDs diretos, inexistente e migração | Sem lacuna obrigatória identificada nesta leitura |
| 3. Conta/sessão | `auth.spec.ts` mais `contracts-realtime.spec.ts`: cadastro, login, logout, troca e expiração no checkout | Expiração é forçada por cenário; falta avançar relógio para verificar TTL real e retomada temporal sem dependência de tempo de parede |
| 4. Favoritos e rollback | `tests/navigation-actions.spec.ts`: remoção, refresh, isolamento e erro 500 com rollback/retry | Integra suíte separada dos 54 E2E; não é correto atribuí-lo apenas a `auth.spec.ts` ou aos 54 |
| 5. Carrinho | `cart.spec.ts`: quantidade, cupom, valores independentes, merge e persistência | Remoção usa dispatchEvent em botão sr-only. Precisa exercitar o controle visual real, por exemplo o botão menos até abrir a confirmação; falta o caso com duas edições do mesmo NFT (R02) |
| 6. Compra completa | `checkout-order.spec.ts` vai de acesso direto ao detalhe ao recibo | Há navegação catálogo→detalhe em outro teste; falta unir a compra principal desde o clique real no catálogo em uma única verificação de ponta a ponta |
| 7. Recusa/clique repetido/timeout | `checkout-order.spec.ts` e `contracts-realtime.spec.ts` | Casos existem e passam no artefato. Controle temporal do timeout precisa ser explícito |
| 8. Perfil/avatar/senha/carteiras | `profile-wallets.spec.ts`, `auth.spec.ts` | Endereço inválido é verificado por API; reforçar feedback pela UI e adicionar falha ao listar carteiras (R04) |
| 9. Preço/disponibilidade no checkout | Preço muda com checkout aberto em `contracts-realtime.spec.ts` | Estoque é esgotado no carrinho e só depois a navegação entra no checkout; falta mudar a disponibilidade com checkout já aberto |
| 10. Versão/reconexão/PENDING | Versão antiga, replay de pedido, desconexão, refresh e pedido único | Casos presentes. Fluxos temporais E2E não usam page.clock; usam esperas com timeout real |
| 11. Teclado/foco/formulários | Enter, Escape, foco inicial e restauração em diferentes testes | Sem percurso Tab/Shift+Tab nem verificação de ciclo de foco do diálogo; as lacunas de R10 permanecem |
| 12. Skeleton/erro/retry | `accessibility-states.spec.ts` testa lentidão, erro e recuperação | Não verifica correspondência de dimensões; falta consulta de carteiras e falha independente de carrinho/carteiras no checkout |

**Regressão visual:** o último relatório tem 7 casos aprovados e 9 falhas, todas em comparações de screenshot: início (390, 414 e 768); autenticação (768 e 1440); fluxo que começa no carrinho (390, 414, 768 e 1440). As falhas do carrinho interrompem o mesmo teste antes de chegar ao pagamento e ao recibo. Não se pode declarar esses screenshots aprovados naquela execução.

Diferença de baseline não prova por si só que o design novo esteja errado. É necessário comparar os diffs com o Figma, corrigir desvios e registrar as mudanças visuais intencionais. Atualizar PNGs sem essa análise só apagaria a evidência da diferença.

**Baselines versionadas:** requisito ainda não atendido no Git local, apesar dos 38 PNGs presentes. Os testes visuais comparam a aplicação a baselines da própria aplicação; não comparam diretamente ao PNG do Figma. A revisão de fidelidade é uma evidência adicional.

**Relógio e isolamento:** contextos de navegador e reset estão presentes; a latência é selecionada por cenários e os eventos por endpoints MSW. Somente as suítes visual e navegação fixam o horário. `tests/e2e/` não controla o relógio; PENDING, desconexão e timeout dependem dos timers reais. Não é necessário congelar indiscriminadamente todos os testes: falta controlar avanço e condições nas verificações sensíveis a tempo.

**Artefatos:** HTML e retenção de traces em falhas estão configurados; existem traces das nove falhas visuais. A CI também prevê upload dos relatórios, mas sua execução remota não foi demonstrada nesta revisão.

## 5. Lighthouse: relatório histórico não aprova o build atual

| Perfil/página | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile `/` | 91 | 98 | 100 | 92 | 3448.6 | 0.00000 | 23.5 |
| mobile `/nfts/nft-1` | 90 | 100 | 100 | 92 | 3552.7 | 0.05151 | 25.0 |
| desktop `/` | 99 | 95 | 100 | 92 | 894.1 | 0.00924 | 0.0 |
| desktop `/nfts/nft-1` | 97 | 100 | 100 | 92 | 931.8 | 0.08780 | 0.0 |

As 12 medições históricas (três por combinação) atendem às quatro categorias exigidas. Há 12 HTMLs, 12 JSONs brutos e um summary.json, ambiente/versões e LCP/CLS/TBT. Esses itens foram encontrados, não estão faltando.

Entretanto, os identificadores divergem:

- HTML medido pelo Lighthouse: `7211640d92dc161726fbd5e8c41f17ca67dfa3681bf34fa8c4b81a4e22b47245`.
- HTML em `dist/index.html` nesta revisão: `efb110a8fc47b0de52ae58a54b55906121ef1c04d346de9c25f978d6672f49f8`.
- HTML do pacote de deploy preparado: `3aba4096a52e83ca01c8d34dd2bb4f9d6fc920ef88d31c0782e4089a6be14bca`.

O relatório foi iniciado em `2026-10-16T00:17:30.218Z`. O campo chamado `buildId` nesse summary antigo contém o hash do HTML; o script atual usa o nome `htmlSha256`. A divergência é material: houve mudanças posteriores de CSS/componentes/dependências. Logo, falta executar a matriz completa de Lighthouse sobre o build final, sem alterar os recursos da entrega para melhorar as notas. As notas históricas não demonstram reprovação do build novo, nem sua aprovação.

## 6. Publicação, versionamento e documentação

- **URL pública obrigatória não comprovada.** `DEPLOYMENT.md` registra tentativas que exigiram autenticação e nenhum endereço confirmado. Não há `.vercel/project.json` nem `.vercel/repo.json` na raiz. Isso não prova ausência de qualquer site externo: significa que esta entrega local não oferece evidência de um deploy concluído.
- **Correspondência entre publicado e entregue não comprovada.** O pacote `artifacts/deploy/preview-d49853545d96` foi gerado para outro HTML, conforme os hashes acima. Precisa ser regenerado depois das correções e associado à versão efetivamente entregue.
- **Git local sem arquivos rastreados e sem commit.** Falta versionar fonte, lockfile, assets, mocks, testes, baselines, configuração e relatórios exigidos, e comprovar que o repositório fornecido contém a entrega. Configuração de origin, sozinha, não cumpre isso.
- **Acesso direto/refresh no ambiente público não demonstrado.** Existe configuração SPA em `vercel.json`, mas falta a evidência do ambiente publicado com MSW e Socket.IO funcionando.
- **Execução a partir de checkout limpo não demonstrada.** README, `.env.example`, lockfile, assets e comandos existem, e não foi encontrada dependência obrigatória de backend privado. Falta verificar a instalação da versão de fato versionada/entregue em um checkout limpo.
- **Documentos de status estavam divergentes.** O relatório anterior afirmava 98% e “apenas deploy pendente”; SCOPE-AUDIT ainda relatava 16 visuais aprovados anteriores, embora o último HTML traga 9 falhas. VISUAL-REVIEW referencia resultados antigos e seus totais de capturas não substituem a contagem atual. A seção de Lighthouse anterior também colapsava páginas e trazia números de acessibilidade que não correspondiam às quatro medianas do summary.

README e ARCHITECTURE já apresentam setup, variáveis, credenciais fictícias, cenários/reset, comandos, contratos, sessão, cache, reconciliação e limitações. Não é correto declarar essa documentação inteiramente ausente. Falta sincronizar o status e atualizar as decisões depois de resolver os pontos desta revisão.

## 7. O que não deve virar trabalho fora do escopo

- Não é obrigatório criar blockchain real, gateway, extensão de carteira ou backend de produção.
- Suporte, atividade, ofertas, downloads e páginas editoriais completas não são exigidos. Avisos coerentes de indisponibilidade atendem à diretriz dessas ações.
- Não é obrigatório inventar uma tela exclusiva para Mercado. Direcionar ao catálogo é uma decisão coerente, desde que busca, filtros, ordenação e navegação funcionem.
- Perfil, carteiras e confirmação precisam funcionar em mobile mesmo sem frame próprio; há implementação responsiva dessas rotas. Ausência de frame não autoriza remover funções obrigatórias, como a revisão dos dados do coletor.
- Totais matematicamente inconsistentes no Figma não devem substituir os valores corretos da cotação da API.
- Não foi identificada nesta leitura confirmação de compra puramente visual, substituição de Socket.IO por setters de UI, ausência de E2E ou exposição comprovada de pedidos entre contas. A implementação contém verificações de proprietário, sessão, idempotência, snapshots e status terminal. Isso não é uma certificação absoluta de ausência de bugs.

## 8. Ordem concreta para concluir a conformidade

1. Corrigir R01–R04 e R06: ordem mobile, estoque por edição, erros de consultas e reset integral.
2. Completar revisão mobile, consistência de contratos/cache, reserva agregada, associações acessíveis e loaders (R05 e R07–R12).
3. Reforçar as verificações da seção 9, executar os fluxos e revisar os nove diffs contra o Figma; registrar as baselines resultantes com a alteração correspondente.
4. Gerar build final e executar Lighthouse nas quatro combinações, três vezes cada, mantendo imagens, fontes e mocks reais da entrega.
5. Sincronizar documentação, versionar a entrega, verificar checkout limpo e publicar o mesmo build. Entregar repositório e URL acessível, com rotas diretas e tempo real funcionando.

Não há aprovação integral nem percentual de conformidade atribuído nesta revisão. As pendências de código, cobertura e entrega acima são distintas e precisam de evidência própria para serem encerradas.
