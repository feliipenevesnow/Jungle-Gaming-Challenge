> Documento histórico: achados anteriores às correções. Consulte SCOPE-AUDIT.md para o estado atual.

# Auditoria de conformidade com o Escopo.txt

Data: 15/10/2026. Objeto: código local atual do Jungle Gaming Challenge.

**Veredito: a entrega ainda não cumpre integralmente o escopo. Há defeitos funcionais graves e um vazamento de pedidos entre usuários, enquadrado no critério eliminatório de exposição de dados. Não recomendo apresentar o projeto como concluído.**

Esta revisão confrontou o enunciado com código, execução das três suítes Playwright, build, lint e sondagens de rede em contextos isolados. A aplicação não foi alterada para fazer os resultados passarem. Os dados do navegador do usuário não foram apagados. Foram acrescentados este relatório, um script de diagnóstico e artefatos locais.

## Resultados executados

| Verificação | Resultado | Limite da evidência |
| --- | --- | --- |
| Build: `npm run build` | Passou | Aviso de bundle principal maior que 500 kB. Compilar não valida regras de negócio. |
| Lint: `npm run lint` | Passou com 24 avisos | Inclui dependências de hooks, efeitos que alteram estado e Fast Refresh. Não equivale a código sem avisos. |
| `npm run typecheck` | Retornou zero | O comando usa `tsc --noEmit` no projeto raiz com `files: []` e referências. Não percorre sozinho os projetos referenciados; o build usa `tsc -b` e efetivamente os verifica. |
| E2E completo, sem retries | **20 passaram; 10 falharam** | 30 casos, desktop e mobile. Falhas em catálogo, carrinho e perfil/carteiras, principalmente seletores/textos antigos. |
| Navegação | **18 passaram; 10 skips** | Skips correspondem a controles ausentes no viewport. Inclui favoritos com rollback e isolamento, Mercado, curva do menu e avisos auxiliares. |
| Visual | **16 passaram** | Quatro larguras: 390, 414, 768 e 1440. Compara a implementação com suas próprias baselines propostas, não diretamente com o Figma. |
| Sondagens de contratos | Defeitos reproduzidos | Valores, acesso a pedidos, sessão, estoque, perfil, carteiras e cenários. JSON em `artifacts/audit/probes.json`. |
| Lighthouse configurado | Não concluiu | Chrome foi encontrado, mas a conexão de depuração falhou antes da primeira medição. Tentativa alternativa também falhou ao iniciar o navegador. Não há notas ou medianas válidas desta execução. |
| Deploy | **Não comprovado** | Há remoto Git configurado, mas nenhuma URL pública de aplicação foi localizada na documentação/configuração inspecionada. Não é possível afirmar se existe um deploy fora deste workspace. |

Relatórios locais: [E2E](artifacts/audit/e2e-report/index.html), [navegação](artifacts/audit/navigation-report/index.html), [visual](artifacts/audit/visual-report/index.html), [sondagens](artifacts/audit/probes.json).

## Achados prioritários

### A01 — Crítico: pedido e recibo acessíveis sem sessão e por outra conta

**Exigências:** seções 3, 4, 5 e 11: pedidos exigem autenticação; isolamento por usuário; exposição entre usuários é eliminatória.

Os handlers `GET /api/orders/:id` e `GET /api/orders/:id/receipt` não consultam autenticação nem comparam o dono do pedido com o solicitante. A página de recibo também carrega o recurso sem proteção de sessão.

Reprodução: criar um pedido de Alex e consultar o ID sem `Authorization`, ou com o token de Sofia. Ambos retornam **HTTP 200**, com dados de Alex. O recibo foi exibido na interface de um visitante sem sessão.

Evidência: `order-access-and-idempotency` em `probes.json` e `artifacts/audit/guest-order-receipt.png`.

Código: `src/mocks/handlers.ts:646`, `src/mocks/handlers.ts:654`, `src/routes/orders.$id.tsx:21`.

### A02 — Crítico: aplicar cupom aumenta o valor da compra

**Exigências:** seção 3: desconto, taxa e total coerentes; precisão decimal em ETH.

Reprodução pela API real interceptada pelo MSW, um Emerald Ape de 1,19 ETH na Ethereum:

| Estado | Subtotal | Desconto retornado | Taxa | Total retornado |
| --- | ---: | ---: | ---: | ---: |
| Sem cupom | 1.19 | 0.00 | 0.016 | **1.206** |
| Com `KURIO10` | 1.19 | 0.11 | 0.016 | **1.316** |

O sinal negativo é aplicado somente à parte inteira na conversão para BigInt: `-0.11` vira um valor positivo. Cotação e pedido reutilizam esse cálculo. Além disso, o desconto de 10% de 1,19 é truncado de 0,119 para 0,11 antes do cálculo final; não existe política de arredondamento documentada que justifique a perda. A escala implementada é de seis casas, enquanto a documentação afirma dezoito.

Os testes recentes de cupom verificam que há desconto e que o recibo repete a API, mas não verificam independentemente a equação do total. Por isso passam apesar desse defeito.

Evidência: `coupon-arithmetic` em `probes.json`. Código: `src/lib/decimal.ts:6`, `src/lib/decimal.ts:12`, `src/mocks/handlers.ts:464`, `src/mocks/handlers.ts:566`.

### A03 — Alto: expiração e invalidação de sessão não estão implementadas no mock

**Exigências:** seções 3, 5 e 6: expiração, logout, acesso não autorizado e retomada de contexto.

O servidor deduz o usuário de `token-<id>`, sem registro de sessões, expiração ou revogação. `expiresAt` é recalculado nas respostas; não é validado. Logout retorna sucesso sem invalidar o token no mock.

Reproduzido: o token continua aceito após logout e com o relógio adiantado 48 horas. O cenário `session-expired` retorna 200 em `/auth/me`. A interface trata um 401 quando ele chega, porém isso não implementa o cenário de expiração requerido.

Código: `src/mocks/handlers.ts:34`, `src/mocks/handlers.ts:293`, `src/lib/auth.tsx`.

### A04 — Alto: compra pendente e recuperação após timeout incompletas

**Exigências:** seções 3, 5 e 7: PENDING → CONFIRMED/REJECTED, recuperação após refresh/reconexão, mesma tentativa após timeout.

O handler cria diretamente `CONFIRMED` ou `REJECTED`. Há uma apresentação de `PENDING` e polling na página, mas o fluxo normal não produz esse estado nem programa sua resolução. O cenário `timeout` espera 15 segundos e retorna 504 **antes de criar o pedido**: a sondagem encontrou zero pedidos persistidos. Isso não exercita o timeout exigido, que ocorre após a criação.

A chave da tentativa é criada em `useState` e muda ao remontar o checkout; não há recuperação persistida da tentativa em andamento. A idempotência básica da API funciona: mesma chave/payload retorna o mesmo pedido e payload diferente retorna 409. Essa parte correta não cobre recuperação após refresh.

Código: `src/mocks/handlers.ts:14`, `src/mocks/handlers.ts:584`, `src/routes/checkout.tsx:29`, `src/routes/orders.$id.tsx:27`.

### A05 — Alto: tempo real não cobre o cenário exigido

**Exigências:** seção 7 e cenários de testes 9/10.

- `socket.io-client` e o binding MSW participam do código, porém `broadcastNftUpdated` só é declarado; nenhum cenário ou mutation da aplicação chama esse emissor. Alterar estoque ao comprar também não emite `nft.updated`.
- Não há listener que reconcilie recursos via REST ao reconectar. O listener `connect` apenas escreve no console, apesar de a documentação afirmar invalidação de queries.
- No carrinho, o callback do evento coloca um aviso; não atualiza linhas, preço ou resumo automaticamente. O botão solicita uma nova cotação, mas os itens do carrinho continuam com seus snapshots antigos até outra atualização.
- O checkout não assina `nft.updated`. Revalida ao confirmar, mas não implementa toda a atualização visível durante a navegação.
- O controle de versões compara eventos entre si, sem comparar a primeira versão recebida com a versão já carregada da API. Também não impede explicitamente regressão de um pedido terminal.
- Uma sondagem tentou emitir pelo binding MSW e observar o aviso do carrinho, mas terminou sem o aviso. Esse resultado é registrado como validação inconclusiva do transporte, não como prova isolada de sua causa. As lacunas acima são verificáveis no código.

Código: `src/mocks/socket.ts:39`, `src/lib/socket.ts`, `src/routes/cart.tsx:39`, `src/routes/checkout.tsx`. Não existem testes de execução desses cenários.

### A06 — Alto: validação de estoque, edição e quantidade insuficiente

**Exigências:** seção 3: inteiros, disponibilidade por NFT/edição, edição indisponível e limite.

Reproduzido: `PATCH /cart/items/:id` aceita `quantity: 999` e `quantity: 1.5`, ambos com HTTP 200. `POST /cart/items` aceita `EDICAO-INEXISTENTE`. A validação de inclusão considera a quantidade recebida, sem assegurar a soma com o item existente. Não há disponibilidade por edição no modelo/API; todos os botões de edição do detalhe são habilitados.

O stepper do detalhe respeita o estoque total e a cotação avisa conflitos; isso é parcial e não substitui a validação consistente no carrinho e no pedido.

Código: `src/mocks/handlers.ts:374`, `src/mocks/db.ts:774`, `src/routes/nfts.$id.tsx:181`.

### A07 — Alto: campos do perfil aparentam sucesso sem persistir

**Exigências:** seções 3 e 5: edição dos dados do perfil e persistência após refresh.

`PATCH /profile` recebe `username`, porém `updateUserProfile` só aplica nome, bio e avatar. A interface envia username e apresenta sucesso, mas o valor permanece antigo. Nome ENS e apelido da carteira são editáveis na tela e não são incluídos no envio nem restaurados. A sondagem confirmou HTTP 200 mantendo `@alex_collector` após solicitar `@novo_usuario`.

O salvamento do perfil também é disparado antes de validar a alteração de senha. Assim, uma submissão pode salvar parte dos dados e simultaneamente mostrar erro de senha. O usuário do contexto de autenticação não é atualizado após editar o perfil, podendo ficar desatualizado no cabeçalho/checkout até recarregar.

Código: `src/routes/profile.tsx:113`, `src/routes/profile.tsx:123`, `src/mocks/db.ts:651`.

### A08 — Alto: carteiras e formulários têm validação e edição parciais

**Exigências:** seções 3 e 5: validação, cadastro e edição de carteira principal/secundária; dados de pagamento; conexão, recusa e desconexão simuladas.

Reproduzido: cadastrar carteira com endereço `abc`, endereço vazio ou rede `SemRede` retorna 201. `PATCH /wallets/:id` muda o rótulo, mas ignora endereço/rede. A tela cadastra carteiras e permite excluir/definir principal; não oferece edição completa dos registros existentes.

No checkout, a confirmação valida nome de exibição, username, carteira e cotação. Outros campos marcados com asterisco não são validados nem enviados como dados do coletor. Escolher WalletConnect/MetaMask/Coinbase só altera um estado de seleção; não há fluxo de conexão, recusa ou desconexão de carteira.

Cadastro valida presença, mas o handler aceitou nome composto só de espaços, e-mail inválido e senha de um caractere. Algumas barreiras do formulário HTML ajudam o uso normal, porém não há contrato de validação consistente na API.

Código: `src/mocks/handlers.ts:714`, `src/mocks/db.ts:691`, `src/routes/checkout.tsx:142`, `src/routes/checkout.tsx:477`, `src/components/AuthModal.tsx`.

### A09 — Médio/alto: cenários, carregamento e acessibilidade incompletos

**Exigências:** seções 6, 8 e cenários 11/12.

- README documenta `network-error` e `latency-high`; ambos retornaram 200 com latência normal. Os nomes efetivamente reconhecidos são `500-error` e `slow-network`. Não há controles completos para conexão indisponível, latência variável/respostas fora de ordem, preço alterado e timeout após criação.
- O catálogo e detalhe têm skeletons. O resumo do carrinho não possui skeleton/shimmer e pode exibir valores de fallback enquanto a cotação carrega. Handlers do carrinho não passam pela simulação de falhas/latência.
- No detalhe, `isError` também mostra “NFT não encontrado”, inclusive para falha de rede/HTTP 500; esse estado não oferece tentativa novamente, confundindo indisponibilidade temporária com recurso inexistente.
- Oito inputs do perfil foram encontrados sem label associado ou nome ARIA. Inputs do filtro de preço e busca/ordenação também merecem revisão de nome acessível. Mensagens de erro não estão sistematicamente associadas aos campos.
- Radix fornece infraestrutura de diálogo, mas `AuthModal` cancela o foco inicial. O teste de zoom verifica foco, porém não existe cobertura abrangente de teclado, foco e validação de formulários exigida no cenário 11.
- Há 31 ocorrências de `any` em arquivos TS/TSX de `src`, incluindo fronteiras de transporte e socket. A tipagem dos contratos é parcial, apesar das interfaces existentes.

Código: `README.md:261`, `README.md:267`, `src/mocks/handlers.ts:14`, `src/routes/cart.tsx:24`, `src/components/AuthModal.tsx:69`.

### A10 — Entrega e documentação ainda não comprovam conformidade

**Exigências:** seções 9, 10 e 12.

A configuração Lighthouse só cobre desktop. Faltam a execução mobile, as doze medições (duas páginas × dois perfis × três), medianas e relatórios/ambiente válidos. A falha de inicialização observada não demonstra notas baixas; demonstra ausência de evidência utilizável nesta revisão.

O README marca todos os itens como concluídos e afirma fidelidade absoluta; essas alegações não correspondem ao resultado da auditoria. `ARCHITECTURE.md` documenta endpoints/parâmetros diferentes dos implementados (`/favorites/:id/toggle`, lista de IDs, `sortBy/sortOrder`), reconciliação inexistente, escala de 18 casas e chave de sessão diferente. Algumas seções mais recentes corrigem partes disso, mas deixam contradições no documento.

A URL pública da aplicação, obrigatória, não foi comprovada. As referências e baselines existem localmente, mas o estado local estava inteiramente sem arquivos rastreados no Git; não há evidência local de que baselines, testes e relatórios tenham sido efetivamente versionados na entrega.

## Matriz do escopo

Legenda: **Atende** = implementação e evidência suficiente para o item específico; **Parcial** = parte funciona, mas há requisito restante; **Não atende** = falta ou defeito comprovado; **Não comprovado** = não há evidência suficiente para aprovar/reprovar.

| Exigência | Estado | Avaliação |
| --- | --- | --- |
| React, TypeScript, Router, Query, Axios, REST, Tailwind, shadcn, MSW e Socket.IO participarem da aplicação | Atende | Uso real identificado; problemas de integração permanecem nos itens específicos. |
| Lighthouse efetivo e metas documentadas | Não comprovado | Configuração parcial e execução sem resultado válido. |
| Catálogo, busca, filtros combináveis, sort e paginação em URL | Parcial | Implementados; evidência automatizada completa de combinações/histórico/paginação insuficiente. |
| Reiniciar paginação ao mudar filtro | Atende | `updateFilters` reinicia em 1. |
| Resultados vazios e falha do catálogo | Atende | Há estados e ação de tentar novamente. |
| Respostas fora de ordem/cancelamento | Parcial | Query keys separam parâmetros; cancelamento explícito só identificado em favoritos, e falta cenário/teste determinístico abrangente. |
| Detalhe direto e NFT inexistente | Atende | Testado nos dois viewports e nos 12 registros. |
| Galeria e quantidade do detalhe | Atende | Testes de galeria/stepper e compra executados; disponibilidade por edição permanece separadamente incompleta. |
| Edição indisponível e estoque por edição | Não atende | Modelo, controles e handlers não tratam o requisito. |
| Favoritos com autenticação, persistência e rollback | Atende | Testes específicos de falha, refresh e troca de conta passaram. |
| Carrinho após refresh/login, preservar visitante | Atende | Fluxo recente testado; reconciliação de linhas seed corrigida. |
| Quantidades inteiras e limites em inclusão/edição/pedido | Não atende | Sondagens aceitaram excesso, fração e edição inexistente. |
| Aplicar/remover cupom e erro inválido/expirado | Atende | Interação e persistência funcionam; a matemática do desconto falha no item seguinte. |
| Subtotal, desconto, taxa e total corretos/precisos | Não atende | Cupom aumenta o total. |
| Atualização de preço/estoque em tempo real | Não atende | Falta emissão acionável e reconciliação completa. |
| Validar campos e revisar checkout | Parcial | Revalidação da cotação existe; formulário e campos do coletor incompletos. |
| Selecionar carteira cadastrada e rede | Atende | Happy paths Ethereum/Polygon executados. |
| Simular conexão, recusa e desconexão da carteira | Não atende | Seleção de provedor só altera estado visual. |
| Revalidar cotação e pedir nova confirmação | Parcial | Refetch/expectedTotal existem; moeda incorreta e alterações em tempo real incompletas. |
| Idempotência básica e clique repetido | Atende | Mesma tentativa retorna o mesmo ID; payload diferente retorna 409. |
| Timeout após criação e recuperação após refresh/reconexão | Não atende | Timeout ocorre antes da criação; tentativa não é persistida no cliente. |
| Pendente, confirmado e recusado | Parcial | Confirmado/recusado funcionam; PENDING não integra o fluxo de criação/resolução. |
| Sucesso somente com resposta CONFIRMED da simulação | Atende | O componente condiciona sucesso ao status; não há atalho visual de confirmação. |
| Preservar carrinho na recusa e remover só comprado no sucesso | Atende | Cobertura funcional e lógica de subtração por NFT/edição/quantidade. |
| Snapshot do pedido independente do catálogo | Atende | Itens e valores são copiados para o pedido. |
| Cadastro, login, logout e sessão após refresh | Parcial | Happy paths e hashes funcionam; invalidação/expiração não. |
| Proteger todos os recursos privados e isolar pedidos | Não atende | A01: pedido e recibo públicos/entre contas. |
| Edição e persistência do perfil e avatar | Parcial | Nome/avatar funcionam; username e outros campos não. |
| Alteração de senha com erros coerentes | Parcial | Hash e verificação da senha atual existem; submissão pode salvar perfil antes de falhar validação da senha. |
| Cadastro e edição de carteiras com validação | Parcial | Cadastro/principal/exclusão funcionam; validação e edição de endereço/rede incompletas. |
| Contratos REST documentados e tipados | Parcial | Há interfaces, mas handlers usam `any` e a documentação diverge. |
| Cenários determinísticos e reset integral | Parcial | Reset existe; faltam cenários e nomes documentados não correspondem aos handlers. |
| Deduplicação, eventos antigos e estados terminais | Parcial | Há mapas de versões; comparação com REST e proteção terminal incompletas. |
| Reconciliação pós-reconexão e subscriptions de sessão | Não atende | Não existe a invalidação REST descrita; recursos privados também não são todos protegidos. |
| Frames desktop/mobile e adaptação 390/768/1440 | Parcial | Telas e baselines presentes; fluxos incompletos e fidelidade integral ao Figma não certificada por esses testes. |
| Skeleton em catálogo, detalhe e resumo do carrinho | Parcial | Falta resumo do carrinho. |
| Teclado, foco, labels e erros acessíveis | Parcial | Infraestrutura e parte da navegação passam; campos sem label e cobertura incompleta. |
| Assets locais e documentação de diferenças | Atende | Imagens, fonte local e `VISUAL-REVIEW.md` presentes. |
| Cobertura dos 12 cenários E2E | Não atende | Cobertura parcial; 10 falhas na execução integral. |
| Regressão visual desktop/mobile com dados estáveis | Atende | Suíte executada em quatro larguras, com a ressalva de que baselines não são o próprio Figma. |
| Lighthouse: três runs por página/perfil, medianas e métricas | Não comprovado | Configuração não cobre mobile e faltam resultados válidos. |
| URL pública e versão publicada correspondente | Não comprovado | Nenhuma URL de aplicação verificada. |
| README/arquitetura reproduzíveis e corretos | Parcial | Contêm instruções úteis, mas também afirmações falsas e cenários inexistentes. |
| Scripts de dev/build/preview/tipos/lint/testes/auditoria | Parcial | Comandos existem; typecheck não percorre referências e Lighthouse não concluiu no ambiente. |

## Cobertura dos 12 cenários de avaliação

| Nº | Cenário exigido | Estado real |
| --- | --- | --- |
| 1 | Busca/filtros combinados/sort/paginação/histórico | Parcial; testes antigos falham e a suíte visual só cobre parte das interações. |
| 2 | Detalhe direto/inexistente | Coberto e aprovado. |
| 3 | Cadastro/login/expiração/logout/troca | Parcial; expiração não implementada. |
| 4 | Favoritos, falha e recuperação | Coberto na suíte de navegação e aprovado. |
| 5 | Quantidades/remoção/cupom/refresh/login | Parcial; há fluxo recente aprovado, mas teste antigo falha e invariantes de estoque/valores estão incorretas. |
| 6 | Catálogo até recibo confirmado | Caminho aprovado; recibo repete valores incorretos quando há cupom. |
| 7 | Recusa/clique repetido/timeout com mesmo pedido | Parcial; faltam timeout após criação e retomada da tentativa. |
| 8 | Perfil/avatar/senha/carteiras/validação | Parcial; testes antigos falham antes de chegar ao fluxo e há defeitos comprovados. |
| 9 | Preço/disponibilidade via Socket.IO no checkout | Sem cobertura executável correspondente. |
| 10 | Duplicados/antigos/desconexão/retomada pendente | Sem cobertura executável correspondente. |
| 11 | Teclado/foco/validação de formulários | Parcial; foco de zoom e alguns controles cobertos, não o cenário completo. |
| 12 | Skeleton lento/falha/tentar novamente | Sem cobertura E2E completa correspondente; resumo do carrinho sem skeleton. |

## Ordem recomendada de correção

1. Bloquear acesso indevido a pedido/recibo em API e rota; exercitar visitante, outra conta e logout.
2. Corrigir sinais/precisão e testar a equação do total com valores esperados independentes do mock.
3. Implementar sessões reais na simulação, com expiração e revogação; preservar contexto na retomada.
4. Completar estados do pedido e recuperação idempotente persistida após timeout/refresh.
5. Completar emissão Socket.IO, reconciliação, proteção de versão/terminal e cenários acionáveis.
6. Corrigir validações de quantidade/edição/estoque, perfil, carteira e dados do checkout.
7. Atualizar testes antigos e completar os 12 cenários, incluindo falhas e acessibilidade.
8. Auditar Lighthouse em build otimizado nos dois perfis, revisar os 15 frames e concluir/validar deploy.
9. Reescrever as alegações de conformidade da documentação para corresponder às evidências finais.

Não é possível atribuir uma nota confiável a partir de testes isolados. O vazamento de pedidos já impede recomendar a entrega no estado atual, independentemente de uma eventual pontuação visual.
