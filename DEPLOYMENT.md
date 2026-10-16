# Publicação verificada — 16/10/2026

Aplicação: [https://jungle-gaming-challenge-7uv2w2gbh-feliipenevesnows-projects.vercel.app](https://jungle-gaming-challenge-7uv2w2gbh-feliipenevesnows-projects.vercel.app)

Repositório configurado: https://github.com/feliipenevesnow/Jungle-Gaming-Challenge — envio dos commits ainda pendente de autorização explícita.

Vercel CLI 64.3.1: **Ready**, target **preview**, deployment `dpl_36a4As6haEyoapWhwtk3DaQXJVNZ`. A configuração do projeto não exige conta Vercel nem senha para acesso. O pacote contém o build estático com MSW, Socket.IO e assets locais, mais fallback SPA em `vercel.json`.

- Código da aplicação: `a99c936db2fbff599a461484ecbdf27d84089e53`.
- Manifesto SHA-256: `061c6cea895c440aa015c2287b8288b42ea0cab10a8ee94bdab06d1f3690422c`.
- HTML SHA-256: `f5509e879a658011e9a8878ab1be7e43be9fcbeeea14ca516d846f92b3aca28b`.
- [Manifesto dos arquivos](reports/build-manifest.json), [recibo da publicação](reports/deployment.json) e [prova do checkout limpo](reports/clean-checkout.json).

O mesmo HTML foi medido nas 12 execuções Lighthouse e aprovado no smoke de produção desktop/mobile. Os 99 arquivos do build foram reproduzidos integralmente no checkout limpo. A confirmação na hospedagem foi por CLI/API; os testes de navegador do build ocorreram em localhost.

O envio usa `--archive=tgz --target preview`. O primeiro envio do novo projeto havia sido automaticamente atribuído à produção pela Vercel; a URL de entrega acima foi criada explicitamente como preview. Não foram enviados `.env`, tokens ou configurações de agentes. Para futuras prévias por código, o projeto tem `VITE_ENABLE_MSW=true` e `VITE_API_BASE_URL=/api`.

```sh
npm run build
npm run prepare:deploy
# Use o pacote impresso, após autenticar e vincular o projeto:
vercel deploy artifacts/deploy/preview-<hash> --yes --no-wait --archive=tgz --target preview
vercel inspect <url>
```
