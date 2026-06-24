'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, X, ShoppingBasket, BookOpen, Layers, Settings,
  LogOut, UtensilsCrossed, Truck, Users, BarChart2, Share2, UserCircle, HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLogo from '@/components/ui/AppLogo'

const navItems = [
  { href: '/analisis',      label: 'Análisis',      icon: BarChart2 },
  { href: '/ingredientes',  label: 'Ingredientes',  icon: ShoppingBasket },
  { href: '/recetas',       label: 'Recetas',        icon: BookOpen },
  { href: '/sub-recetas',   label: 'Sub-Recetas',    icon: Layers },
  { href: '/menus',         label: 'Menús',          icon: UtensilsCrossed },
  { href: '/proveedores',   label: 'Proveedores',       icon: Truck },
  { href: '/colaboradores', label: 'Colaboradores',     icon: Users },
  { href: '/compartido',    label: 'Compartido conmigo', icon: Share2 },
  { href: '/configuracion', label: 'Configuración',     icon: Settings },
  { href: '/ayuda',         label: 'Ayuda',              icon: HelpCircle },
  { href: '/cuenta',        label: 'Mi Cuenta',          icon: UserCircle },
]

export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <AppLogo size={28} withText />
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {open && (
        <div className="bg-white border-b border-slate-200 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-brand-500' : 'text-slate-400'} />
                {item.label}
              </Link>
            )
          })}
          <div className="border-t border-slate-100 pt-1 mt-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  )
}
