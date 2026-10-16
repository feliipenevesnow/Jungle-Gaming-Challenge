import { Link, useNavigate } from '@tanstack/react-router'
import { 
  User as UserIcon, 
  MapPin, 
  TrendingUp, 
  Heart, 
  Tag, 
  Download, 
  AlertTriangle, 
  LogOut 
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { UnavailableAction } from '@/components/ActionNotice'

export type AccountTab = 'profile' | 'wallets' | 'favorites'

export function AccountNav({ activeTab }: { activeTab: AccountTab }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="border-0 md:border md:border-[#3F2319] bg-transparent md:bg-[#241612] rounded-xl p-0 md:p-5 shadow-none md:shadow-lg">
        <h2 className="hidden md:block text-lg font-bold text-white mb-6">Meu perfil</h2>
        
        {/* Mobile: Sleek horizontal scroll pills bar. Desktop: Vertical column list */}
        <nav className="flex flex-row md:flex-col overflow-x-auto no-scrollbar gap-2 md:gap-1 text-xs pb-3 md:pb-0">
          <Link
            to="/profile"
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            className={`flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium transition-colors ${
              activeTab === 'profile'
                ? 'active bg-[#D28A4C] text-[#140D0A] font-bold md:text-[#E89B55] md:bg-[#140D0A]/60 md:border-l-2 md:border-[#D28A4C] md:rounded-l-none'
                : 'bg-[#241612] md:bg-transparent border border-[#3F2319] md:border-0 text-[#CFB28C] hover:text-[#E89B55] hover:border-[#D28A4C] md:hover:bg-[#140D0A]/30'
            }`}
          >
            <UserIcon className={`w-4 h-4 ${activeTab === 'profile' ? 'text-[#140D0A] md:text-[#D28A4C]' : 'text-[#CFB28C]'}`} />
            <span>Dados do perfil</span>
          </Link>

          <Link
            to="/wallets"
            aria-current={activeTab === 'wallets' ? 'page' : undefined}
            className={`flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium transition-colors ${
              activeTab === 'wallets'
                ? 'active bg-[#D28A4C] text-[#140D0A] font-bold md:text-[#E89B55] md:bg-[#140D0A]/60 md:border-l-2 md:border-[#D28A4C] md:rounded-l-none'
                : 'bg-[#241612] md:bg-transparent border border-[#3F2319] md:border-0 text-[#CFB28C] hover:text-[#E89B55] hover:border-[#D28A4C] md:hover:bg-[#140D0A]/30'
            }`}
          >
            <MapPin className={`w-4 h-4 ${activeTab === 'wallets' ? 'text-[#140D0A] md:text-[#D28A4C]' : 'text-[#CFB28C]'}`} />
            <span>Carteiras</span>
          </Link>

          <UnavailableAction
            name="Atividade"
            className="flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium bg-[#241612] md:bg-transparent border border-[#3F2319] md:border-0 text-[#CFB28C] hover:text-[#E89B55] hover:border-[#D28A4C] md:hover:bg-[#140D0A]/30 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-[#CFB28C]" />
            <span>Atividade</span>
          </UnavailableAction>

          <Link
            to="/favorites"
            aria-current={activeTab === 'favorites' ? 'page' : undefined}
            className={`flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'active bg-[#D28A4C] text-[#140D0A] font-bold md:text-[#E89B55] md:bg-[#140D0A]/60 md:border-l-2 md:border-[#D28A4C] md:rounded-l-none'
                : 'bg-[#241612] md:bg-transparent border border-[#3F2319] md:border-0 text-[#CFB28C] hover:text-[#E89B55] hover:border-[#D28A4C] md:hover:bg-[#140D0A]/30'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'text-[#140D0A] md:text-[#D28A4C]' : 'text-[#CFB28C]'}`} />
            <span>Lista de interesse</span>
          </Link>

          <UnavailableAction
            name="Ofertas"
            className="flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium bg-[#241612] md:bg-transparent border border-[#3F2319] md:border-0 text-[#CFB28C] hover:text-[#E89B55] hover:border-[#D28A4C] md:hover:bg-[#140D0A]/30 transition-colors"
          >
            <Tag className="w-4 h-4 text-[#CFB28C]" />
            <span>Ofertas</span>
          </UnavailableAction>

          <UnavailableAction
            name="Arquivos baixados"
            className="flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium bg-[#241612] md:bg-transparent border border-[#3F2319] md:border-0 text-[#CFB28C] hover:text-[#E89B55] hover:border-[#D28A4C] md:hover:bg-[#140D0A]/30 transition-colors"
          >
            <Download className="w-4 h-4 text-[#CFB28C]" />
            <span>Arquivos baixados</span>
          </UnavailableAction>

          <UnavailableAction
            name="Suporte"
            className="flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium bg-[#241612] md:bg-transparent border border-[#3F2319] md:border-0 text-[#CFB28C] hover:text-[#E89B55] hover:border-[#D28A4C] md:hover:bg-[#140D0A]/30 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-[#CFB28C]" />
            <span>Suporte</span>
          </UnavailableAction>

          <div className="hidden md:block border-t border-[#3F2319] my-2" />

          <button
            type="button"
            onClick={() => {
              logout()
              navigate({ to: '/' })
            }}
            className="flex items-center gap-2 md:gap-3 px-3.5 py-2 md:py-2.5 rounded-full md:rounded shrink-0 whitespace-nowrap font-medium bg-[#241612] md:bg-transparent border border-[#5A201A] md:border-0 text-[#F0805F] hover:bg-[#F0805F]/10 md:hover:bg-[#140D0A]/50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </nav>
      </div>
    </aside>
  )
}
