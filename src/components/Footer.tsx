import React from 'react'
import { Link } from '@tanstack/react-router'
import { UnavailableAction, useActionNotice } from '@/components/ActionNotice'

export const Footer: React.FC = () => {
  const showNotice = useActionNotice()
  return (
    <footer className="mt-20 border-t border-[#3F2319] bg-[#140D0A] font-mono">
      {/* 4 Pillars Section matching Figma 11:1278 and 2:2 */}
      <div className="border-b border-[#3F2319] bg-[#241612]/40 py-12">
        <div className="mx-auto grid max-w-310 grid-cols-1 gap-8 px-4 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
          {/* Pillar 1: W */}
          <div className="flex flex-col gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D28A4C] font-mono text-lg font-bold text-[#140D0A] shadow-md">
              W
            </div>
            <h4 className="font-mono text-sm font-bold text-[#F5F1EB]">
              Segurança da carteira
            </h4>
            <p className="font-mono text-xs leading-relaxed text-[#CFB28C]">
              Proteja sua carteira e colecione arte digital verificada com confiança.
            </p>
          </div>

          {/* Pillar 2: C */}
          <div className="flex flex-col gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D28A4C] font-mono text-lg font-bold text-[#140D0A] shadow-md">
              C
            </div>
            <h4 className="font-mono text-sm font-bold text-[#F5F1EB]">
              Criadores em destaque
            </h4>
            <p className="font-mono text-xs leading-relaxed text-[#CFB28C]">
              Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.
            </p>
          </div>

          {/* Pillar 3: D */}
          <div className="flex flex-col gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D28A4C] font-mono text-lg font-bold text-[#140D0A] shadow-md">
              D
            </div>
            <h4 className="font-mono text-sm font-bold text-[#F5F1EB]">
              Alertas de lançamentos
            </h4>
            <p className="font-mono text-xs leading-relaxed text-[#CFB28C]">
              Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.
            </p>
          </div>

          {/* Pillar 4: Newsletter */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-sm font-bold text-[#F5F1EB]">
              Antecipe-se ao próximo lançamento
            </h4>
            <form onSubmit={event => { event.preventDefault(); showNotice({ title: 'Novidades por e-mail', description: 'A inscrição em novidades está fora do escopo desta demonstração. Seu e-mail não foi enviado nem cadastrado.' }) }} className="flex">
              <input
                type="email" aria-label="E-mail para novidades"
                placeholder="digite seu e-mail..."
                className="w-full rounded-l-md border border-[#3F2319] bg-[#140D0A] px-3 py-2 font-mono text-xs text-[#F5F1EB] placeholder:text-[#CFB28C]/60 focus:border-[#D28A4C] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-r-md bg-[#D28A4C] px-4 py-2 font-mono text-xs font-bold text-[#140D0A] transition-colors hover:bg-[#E89B55]"
              >
                Enviar
              </button>
            </form>
            <p className="font-mono text-[11px] leading-relaxed text-[#CFB28C]">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </div>
        </div>
      </div>

      {/* Brown Sub-bar matching Figma layout */}
      <div className="border-b border-[#3F2319] bg-[#241612] py-4">
        <div className="mx-auto flex max-w-310 flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-8 text-xs font-mono text-[#CFB28C]">
          <span className="font-bold tracking-[0.2em] text-[#F5F1EB] text-sm">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <span className="text-[#CFB28C] hover:text-[#E89B55]">contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-310 px-4 py-12 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h5 className="font-mono text-sm font-bold text-[#F5F1EB]">Meu perfil</h5>
            <ul className="mt-4 flex flex-col gap-2 font-mono text-xs text-[#CFB28C]">
              <li><Link to="/profile" className="hover:text-[#E89B55]">Meu perfil</Link></li>
              <li><UnavailableAction name="Minha coleção" className="hover:text-[#E89B55]">Minha coleção</UnavailableAction></li>
              <li><UnavailableAction name="Atividade" className="hover:text-[#E89B55]">Atividade</UnavailableAction></li>
              <li><UnavailableAction name="Estúdio do criador" className="hover:text-[#E89B55]">Estúdio do criador</UnavailableAction></li>
              <li><Link to="/favorites" className="hover:text-[#E89B55]">Lista de interesse</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-mono text-sm font-bold text-[#F5F1EB]">Central de ajuda</h5>
            <ul className="mt-4 flex flex-col gap-2 font-mono text-xs text-[#CFB28C]">
              <li><UnavailableAction name="Central de ajuda" className="hover:text-[#E89B55]">Central de ajuda</UnavailableAction></li>
              <li><UnavailableAction name="Como comprar NFTs" className="hover:text-[#E89B55]">Como comprar NFTs</UnavailableAction></li>
              <li><UnavailableAction name="Carteira e segurança" className="hover:text-[#E89B55]">Carteira e segurança</UnavailableAction></li>
              <li><UnavailableAction name="Política do mercado" className="hover:text-[#E89B55]">Política do mercado</UnavailableAction></li>
              <li><UnavailableAction name="Denunciar item" className="hover:text-[#E89B55]">Denunciar item</UnavailableAction></li>
            </ul>
          </div>

          <div>
            <h5 className="font-mono text-sm font-bold text-[#F5F1EB]">Coleções</h5>
            <ul className="mt-4 flex flex-col gap-2 font-mono text-xs text-[#CFB28C]">
              <li><Link to="/" search={{ collection: 'Arte digital' }} hash="catalogo" className="hover:text-[#E89B55]">Arte digital</Link></li>
              <li><Link to="/" search={{ collection: 'Fotografia' }} hash="catalogo" className="hover:text-[#E89B55]">Fotografia</Link></li>
              <li><Link to="/" search={{ collection: 'Música' }} hash="catalogo" className="hover:text-[#E89B55]">Música</Link></li>
              <li><Link to="/" search={{ collection: 'Arte 3D' }} hash="catalogo" className="hover:text-[#E89B55]">Arte 3D</Link></li>
              <li><Link to="/" search={{ collection: 'Utilidade' }} hash="catalogo" className="hover:text-[#E89B55]">Utilidade</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-mono text-sm font-bold text-[#F5F1EB]">Redes sociais</h5>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#CFB28C]">
              <button type="button" aria-label="Facebook" onClick={() => showNotice({ title: 'Facebook', description: 'Não há um perfil oficial de Facebook configurado para esta demonstração.' })} className="flex h-8 w-8 items-center justify-center rounded border border-[#3F2319] hover:border-[#D28A4C] hover:text-[#E89B55] cursor-pointer">f</button>
              <button type="button" aria-label="Instagram" onClick={() => showNotice({ title: 'Instagram', description: 'Não há um perfil oficial de Instagram configurado para esta demonstração.' })} className="flex h-8 w-8 items-center justify-center rounded border border-[#3F2319] hover:border-[#D28A4C] hover:text-[#E89B55] cursor-pointer">📷</button>
              <button type="button" aria-label="X" onClick={() => showNotice({ title: 'X', description: 'Não há um perfil oficial de X configurado para esta demonstração.' })} className="flex h-8 w-8 items-center justify-center rounded border border-[#3F2319] hover:border-[#D28A4C] hover:text-[#E89B55] cursor-pointer">𝕏</button>
              <button type="button" aria-label="LinkedIn" onClick={() => showNotice({ title: 'LinkedIn', description: 'Não há um perfil oficial de LinkedIn configurado para esta demonstração.' })} className="flex h-8 w-8 items-center justify-center rounded border border-[#3F2319] hover:border-[#D28A4C] hover:text-[#E89B55] cursor-pointer">in</button>
              <button type="button" aria-label="YouTube" onClick={() => showNotice({ title: 'YouTube', description: 'Não há um perfil oficial de YouTube configurado para esta demonstração.' })} className="flex h-8 w-8 items-center justify-center rounded border border-[#3F2319] hover:border-[#D28A4C] hover:text-[#E89B55] cursor-pointer">▶</button>
            </div>

            <h5 className="font-mono text-xs font-bold text-[#F5F1EB] mt-6">Carteiras compatíveis</h5>
            <div className="mt-2 inline-block rounded-md border border-[#55321F] bg-[#241612] px-3 py-1.5 text-center">
              <span className="font-mono text-[9px] font-bold tracking-wider text-[#E89B55]">
                METAMASK • WALLETCONNECT • COINBASE
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 border-t border-[#3F2319] pt-6 text-center">
          <p className="font-mono text-xs text-[#CFB28C]">
            © 2026 Kurio. Propriedade digital para todos.
          </p>
        </div>
      </div>
    </footer>
  )
}
