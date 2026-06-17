'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShoppingBasket, BookOpen, Layers, Settings, LogOut,
  UtensilsCrossed, Truck, Users, BarChart2, Share2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import AppLogo from '@/components/ui/AppLogo'

const navItems = [
  { href: '/analisis',      label: 'Análisis',       icon: BarChart2 },
  { href: '/ingredientes',  label: 'Ingredientes',   icon: ShoppingBasket },
  { href: '/recetas',       label: 'Recetas',         icon: BookOpen },
  { href: '/sub-recetas',   label: 'Sub-Recetas',     icon: Layers },
  { href: '/menus',         label: 'Menús',           icon: UtensilsCrossed },
]

const secondaryItems = [
  { href: '/proveedores',   label: 'Proveedores',        icon: Truck },
  { href: '/colaboradores', label: 'Colaboradores',      icon: Users },
  { href: '/compartido',    label: 'Compartido conmigo', icon: Share2 },
  { href: '/configuracion', label: 'Configuración',      icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [userInfo, setUserInfo] = useState<{ email: string; nombre: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserInfo({
        email:  user.email ?? '',
        nombre: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '',
      })
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isActive = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon size={17} className={isActive ? 'text-brand-500' : 'text-slate-400'} />
        {label}
      </Link>
    )
  }

  const initials = userInfo
    ? (userInfo.nombre || userInfo.email).slice(0, 2).toUpperCase()
    : '?'

  const isAccountActive = pathname === '/cuenta'

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <AppLogo size={34} withText />
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(item => <NavLink key={item.href} {...item} />)}
        </div>
        <div className="my-3 border-t border-slate-100" />
        <div className="space-y-0.5">
          {secondaryItems.map(item => <NavLink key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Bottom: user + sign out */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-0.5">
        {/* Mi Cuenta */}
        <Link
          href="/cuenta"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors w-full ${
            isAccountActive
              ? 'bg-brand-50 text-brand-600'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
            isAccountActive ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate leading-tight">
              {userInfo?.nombre || 'Mi Cuenta'}
            </p>
            {userInfo?.email && (
              <p className="text-xs text-slate-400 truncate leading-tight">{userInfo.email}</p>
            )}
          </div>
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={16} className="flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
