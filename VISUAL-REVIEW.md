# Revisão visual do Kurio

Referências: `Escopo.txt`, `Telas Figma.txt` e os 15 PNGs originais em `figma-screens/` (9 desktop e 6 mobile). Os originais não foram modificados.

## Implementação

- Composições específicas para mobile: busca, hero, catálogo em duas colunas alternadas e navegação inferior; detalhe com ações de compra; carrinho; pagamento com carteiras; login e cadastro em tela inteira.
- Desktop: geometria do cabeçalho, hero, filtros, cards, detalhe, carrinho, pagamento, recibo, formulários de perfil/carteiras, modais e rodapé.
- Assets locais e Roboto Mono local, com licença OFL em `public/assets/fonts/`. Regras visuais concentradas em `src/figma.css`.
- As páginas continuam usando a API mock para dados, favoritos, carrinho, sessão e pedidos. Corrigidos o formato de restauração de sessão, a precisão das taxas no total e a exibição de sucesso somente para pedido confirmado.

## Conferência reproduzível

```sh
npm run dev -- --host 127.0.0.1 --port 5174
npm run capture:figma
npm run test:visual
npm run build
npm run lint
```

Abra `artifacts/figma/report.html` no navegador. O relatório oferece os 15 pares Figma/implementação, escala de 50–100% e sobreposição com opacidade ajustável. As capturas adicionais ficam na mesma pasta.

Os testes cobrem 390×844, 414×896, 768×1024 e 1440×900, com 16 cenários e 36 capturas de telas (mais 2 recortes do menu na suíte de navegação). Verificam ausência de overflow horizontal, busca persistida na URL, filtros, edição/quantidade do NFT, confirmação de senha, restauração de sessão, carrinho, seleção de provedor e pedido com valores preservados. Fontes e imagens são aguardadas; relógio fixado; identificador variável do recibo é mascarado apenas nos snapshots automatizados.

`tests/visual-baselines/` contém **propostas de baseline revisadas visualmente pelo agente**, ainda sujeitas à revisão humana. O teste compara a implementação com essas capturas, não diretamente com os PNGs do Figma. Portanto, testes verdes comprovam estabilidade e fluxos cobertos, não identidade pixel a pixel com o design. Examine o relatório e qualquer diff antes de atualizar uma baseline. Gere e compare snapshots no mesmo ambiente Chromium/Windows; outros sistemas podem rasterizar fontes de maneira diferente.

## Diferenças de conteúdo preservadas

- Carrinho mobile: 1,19 + 1,39 + 3,58 + 1,98 = **8,14 ETH**. A referência mostra subtotal 8,92; o código calcula 8,14 e total 8,156 com taxa 0,016, sem falsificar o preço.
- Perfil e carteiras exibem os dados reais da sessão mock; o Figma mostra campos vazios. Os itens e quantidades do carrinho são preparados pela API no script de captura.
- IDs de transação, data e carteira provêm do pedido. Telas desktop com conteúdo dinâmico podem ter altura diferente do canvas exportado. Nos viewports menores, formulários longos permitem rolagem.
- As suítes funcional, de navegação e visual são executadas separadamente; resultados atuais estão em SCOPE-AUDIT.md.

O estado atual de build, lint, testes, Lighthouse e publicação é registrado em SCOPE-AUDIT.md. A auditoria inicial foi preservada separadamente e não representa o código após as correções.

## Revisão do menu e dos destinos

O recorte inferior agora deixa o conteúdo aparecer por trás do botão central. O path foi ajustado ao contorno da referência de 414 px (profundidade central de 49 px). A prova automatizada coloca uma cor contrastante atrás do menu e verifica os pixels no recorte e na área opaca; a captura isolada fica em `tests/visual-baselines/figma-mobile-414/menu-inferior.png`.

A política dos botões sem frame e a decisão sobre Mercado estão em `ARCHITECTURE.md`, seção “Figma e decisões de UX”. Execute `npm run test:navigation` para os cenários adicionais. Os skips dessa suíte correspondem a controles ausentes no viewport: o rodapé/zoom/Mercado do cabeçalho não aparecem no mobile, e o menu inferior não aparece no desktop/tablet.

O relatório HTML contém imagens estáticas, não uma instância navegável da aplicação. Use o link “Abrir aplicação interativa” no topo para testar os controles. Os testes do cabeçalho agora partem tanto do Início quanto de outra rota e exigem resultado visível para Mercado, Criadores, Aprenda, busca, carrinho e Entrar.


## Cupom e confirmação de compra

O gatilho de cupom no checkout agora abre um diálogo funcional. No mobile (390/414), o acesso foi incluído acima de “Carteira e rede”, deslocando essa seção em 20 px sem mover o botão inferior de confirmação. Esse estado adicional atende ao comportamento obrigatório de cupom; não existe frame específico para o diálogo. Os dois diffs de pagamento mobile foram inspecionados e as baselines propostas atualizadas, sem alterar tolerâncias. Desktop/tablet mantêm a composição; os campos do coletor agora usam os dados da sessão, em vez de valores fixos de Alex Rivera.

As baselines continuam sendo propostas técnicas para revisão, não uma aprovação humana de fidelidade integral ao Figma.

## Correção de conformidade — 15/10/2026

As quatro baselines de autenticação mobile (login/cadastro em 390 e 414 px) foram atualizadas após inspeção individual dos diffs: o foco inicial visível permite operar os diálogos pelo teclado. As tolerâncias continuam iguais. Esta alteração de acessibilidade é intencional; as baselines seguem propostas técnicas, sem aprovação humana implícita.

Assets grandes passaram a WebP lossless; a igualdade dos pixels RGBA com os PNGs foi verificada. Roboto Mono usa WOFF2 local com os mesmos glifos latinos básicos, acentos portugueses, sinais tipográficos e pesos utilizados (400–700). Os originais PNG e TTF permanecem disponíveis. O skeleton do detalhe agora reutiliza os contêineres e proporções finais para reduzir deslocamentos durante carregamento.

A revisão funcional incluiu proteção de pedidos/recibos, expiração e recuperação da sessão, cupons com precisão de 18 casas, campos de perfil/carteiras, estoque por edição, estados pendentes/recusados e eventos Socket.IO. Esses comportamentos têm testes próprios e não são comprovados apenas por screenshots.

## Correções da auditoria completa — 16/10/2026

Foram inspecionados os 11 diffs iniciais e as capturas geradas em 390, 414, 768 e 1440 px. Os arquivos originais do Figma e a tolerância de 0,5% não foram alterados. As mudanças nas propostas de baseline são:

- Início mobile: corações persistentes e contorno transparente do menu, fundo do hero e ordem natural da API. O quarto card deixa de ser artificialmente trocado com o sétimo por CSS; o Figma diverge na seleção entre desktop e mobile, mas ordenar e ler o catálogo precisa manter a mesma sequência do resultado da API.
- Início desktop/tablet: intervalo de preço editável com precisão de até 18 casas e 1 px reservado na linha de preço para os alinhamentos dos valores com desconto. Skeleton e card final agora têm a mesma altura. O pixel também afeta relacionados e rodapé.
- Autenticação: retirada a translação duplicada do componente Dialog. Os modais respeitam o centro horizontal e a posição vertical do Figma; o foco inicial permanece visível para teclado.
- Carrinho desktop/tablet: resumo sem caixa arredondada e sem padding extra, como no Figma. A remoção usa o controle menos e confirmação acessível. Mobile: resumo usa a geometria final durante a recotação e mantém os totais corretos da API. Em 390 px o conteúdo atrás do resumo pode ser rolado; o padding inferior reserva o espaço do painel fixo.
- Perfil/carteiras mobile: retorno ao início e navegação horizontal entre opções da conta, sem ocultar ações. Não há frame mobile dessas telas; a adaptação mantém tokens, campos e operações do desktop. Selects usam os componentes estilizados do projeto.
- Pagamento mobile: resumo dos dados do coletor com “Revisar dados”, além do acesso ao cupom já existente. A linha adicional desloca carteiras/provedores para baixo, necessária para revisar e corrigir campos obrigatórios antes de comprar; o botão de confirmação continua no fim da tela.

Conteúdo, nomes e seleção inicial das carteiras vêm da sessão mock e podem diferir do texto dos frames. As baselines continuam sendo evidência de regressão da implementação; não representam uma certificação de identidade pixel a pixel com o Figma. Resultados finais e limitações estão no relatório de auditoria atualizado.
