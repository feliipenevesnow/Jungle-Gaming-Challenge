export default {
  port: 4175,
  runs: 3,
  profiles: ['mobile', 'desktop'],
  pages: [['/', 'inicio'], ['/nfts/nft-1', 'detalhe']],
  budgets: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
}
