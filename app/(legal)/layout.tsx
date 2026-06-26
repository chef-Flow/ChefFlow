import Link from 'next/link'
import AppLogo from '@/components/ui/AppLogo'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-extrabold text-brand-600 text-base tracking-tight">ChefFlow</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-500 hover:text-brand-600 transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-slate-100 py-6 px-4 text-center text-sm text-slate-400">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-2">
          <Link href="/privacidad" className="hover:text-brand-600 transition-colors">Privacidad</Link>
          <Link href="/arco" className="hover:text-brand-600 transition-colors">Aviso ARCO</Link>
          <Link href="/terminos" className="hover:text-brand-600 transition-colors">Términos</Link>
          <Link href="/reembolsos" className="hover:text-brand-600 transition-colors">Reembolsos</Link>
          <Link href="/cancelacion" className="hover:text-brand-600 transition-colors">Cancelación</Link>
          <Link href="/cumplimiento" className="hover:text-brand-600 transition-colors">Cumplimiento</Link>
        </div>
        <p>© 2025 ChefFlow · Todos los derechos reservados</p>
      </footer>
    </div>
  )
}
