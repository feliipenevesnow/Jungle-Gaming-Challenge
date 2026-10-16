# Evidências da validação

Os relatórios finais são copiados após os comandos correspondentes. Abra os HTMLs no navegador ou use `npx playwright show-report <pasta>`.

- [Playwright E2E](playwright/e2e/index.html) — fluxos e recuperação em desktop/mobile.
- [Navegação e favoritos](playwright/navigation/index.html) — também comprova a transparência do recorte inferior por leitura de pixels.
- [Regressão visual](playwright/visual/index.html) — quatro larguras, fontes/imagens locais e relógio fixo.
- [Lighthouse](../lighthouse-report/summary.json) — 12 medições e medianas sobre o build final; HTML/JSON brutos na mesma pasta.
- [Auditoria anterior às correções](audit-before-fixes.md) — documento histórico, substituído pelo relatório atual na raiz.

A pasta `playwright/failures-before-fixes/` contém um trace histórico do aviso de reconciliação, corrigido em `bd62536`. Não é uma falha da rodada final. Para inspecioná-lo:

```sh
npx playwright show-trace reports/playwright/failures-before-fixes/cart-reconciliation.trace.zip
```

Novas execuções retêm seus próprios traces em `test-results/`, `artifacts/navigation-results/` e `artifacts/visual-results/` quando há falha. A CI publica relatórios e traces como artefatos. Resultados e limitações da entrega estão em [RELATORIO-AUDITORIA-ESCOPO.md](../RELATORIO-AUDITORIA-ESCOPO.md).
