export function SummarySkeleton({ label = 'Carregando resumo do carrinho...' }: { label?: string }) {
  return <span className="summary-skeleton" role="status">
    <span className="sr-only">{label}</span>
    {[0, 1, 2, 3].map(index => <i key={index} className="skeleton-shimmer" />)}
  </span>
}
