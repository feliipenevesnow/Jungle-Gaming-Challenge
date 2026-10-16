import { ArrowRight } from 'lucide-react'
export function Hero() {
  return <section className="hero" aria-label="Destaque Kurio">
    <div className="hero-copy">
      <p className="hero-welcome">Bem-vindo à Kurio</p>
      <h1><span className="hero-desktop-title">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</span><span className="hero-mobile-title">SEJA DONO DA<br />CULTURA DIGITAL</span></h1>
      <p className="hero-description"><span className="hero-desktop-title">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</span><span className="hero-mobile-title">Descubra NFTs selecionados de criadores do mundo todo.</span></p>
      <a href="#catalogo" className="hero-cta">EXPLORAR <ArrowRight size={16} /></a>
    </div>
    <div className="hero-art"><img src="/assets/images/hero-nft.webp" alt="Emerald Ape, destaque da coleção Kurio" fetchPriority="high" /><img className="hero-mini" src="/assets/images/sage-nomad.webp" alt="" /></div>
    <div className="hero-dots" aria-hidden="true"><i /><i /><i /></div>
  </section>
}
