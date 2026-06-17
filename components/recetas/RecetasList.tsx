'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, BookOpen, TrendingUp, TrendingDown, ChefHat, Lock, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import PaywallModal from '@/components/paywall/PaywallModal'
import { useUserPlan } from '@/lib/hooks/useUserPlan'
import type { Receta, Menu } from '@/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

const pct = (v: number) => `${v.toFixed(1)}%`

interface Props {
  initialRecetas: Receta[]
  ivaDefault: number
  margenMinimoDefault: number
  menus: Pick<Menu, 'id' | 'nombre' | 'color'>[]
}

export default function RecetasList({ initialRecetas, ivaDefault, margenMinimoDefault, menus }: Props) {
  const [recetas, setRecetas] = useState<Receta[]>(initialRecetas)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [porciones, setPorciones] = useState('1')
  const [menuId, setMenuId] = useState('')
  const [loading, setLoading] = useState(false)
  const plan = useUserPlan()
  const supabase = createClient()

  const fetch = async () => {
    const { data } = await supabase.from('recetas').select('*').order('nombre')
    if (data) setRecetas(data as Receta[])
  }

  const handleClickNueva = () => {
    if (!plan.canCreateReceta) {
      setIsPaywallOpen(true)
    } else {
      setIsCreateOpen(true)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: newReceta } = await supabase
      .from('recetas')
      .insert({ user_id: user!.id, nombre: nombre.trim(), porciones: Number(porciones) || 1 })
      .select('id')
      .single()

    if (newReceta && menuId) {
      await supabase.from('menu_recetas').insert({
        menu_id: menuId,
        receta_id: newReceta.id,
        orden: 0,
      })
    }

    await fetch()
    plan.refresh()
    setLoading(false)
    setIsCreateOpen(false)
    setNombre('')
    setPorciones('1')
    setMenuId('')
  }

  const isStale = (iso: string) => {
    const d = new Date(iso)
    d.setMonth(d.getMonth() + 3)
    return d < new Date()
  }

  const margenReceta = (r: Receta) => {
    if (!r.precio_venta || r.precio_venta <= 0) return null
    const sinIva = r.precio_venta / (1 + ivaDefault / 100)
    const margenPct = sinIva > 0 ? ((sinIva - r.costo_por_porcion) / sinIva) * 100 : 0
    return margenPct
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recetas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {recetas.length} receta{recetas.length !== 1 ? 's' : ''} registrada
            {recetas.length !== 1 ? 's' : ''}
            {plan.plan === 'free' && (
              <span className="ml-2 text-amber-600 font-medium">
                ({plan.recetasCount}/3 plan gratuito)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleClickNueva}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          {plan.canCreateReceta ? <Plus size={16} /> : <Lock size={15} />}
          Nueva receta
        </button>
      </div>

      {/* List */}
      {recetas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <BookOpen className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Aún no tienes recetas.</p>
          <button
            onClick={handleClickNueva}
            className="mt-3 text-brand-600 text-sm font-semibold hover:text-brand-700"
          >
            Crea tu primera receta →
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recetas.map((r) => {
            const margen = margenReceta(r)
            const margenOk = margen !== null && margen >= margenMinimoDefault
            const stale = isStale(r.updated_at)

            return (
              <Link
                key={r.id}
                href={`/recetas/${r.id}`}
                className="block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group overflow-hidden"
              >
                {/* Photo thumbnail */}
                <div className="relative w-full h-28 bg-gradient-to-br from-brand-50 to-amber-50">
                  {r.foto_url ? (
                    <Image src={r.foto_url} alt={r.nombre} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat size={28} className="text-brand-200" />
                    </div>
                  )}
                  {stale && (
                    <span className="absolute top-2 left-2 flex items-center gap-0.5 text-xs bg-amber-500/90 text-white px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm">
                      <Clock size={9} /> Verificar precios
                    </span>
                  )}
                </div>

                <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors text-sm leading-tight">
                      {r.nombre}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {r.porciones} porción{r.porciones !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  {margen !== null && (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                        margenOk
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {margenOk ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {pct(margen)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">Costo/porción</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {r.costo_por_porcion > 0 ? fmt(r.costo_por_porcion) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Precio venta</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {r.precio_venta ? fmt(r.precio_venta) : '—'}
                    </div>
                  </div>
                </div>

                {margen !== null && !margenOk && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5">
                    <TrendingDown size={12} />
                    Margen por debajo del {pct(margenMinimoDefault)} mínimo
                  </div>
                )}
                </div>{/* /p-4 */}
              </Link>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setNombre(''); setPorciones('1'); setMenuId('') }} title="Nueva receta" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la receta <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Hamburguesa clásica"
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Número de porciones <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={porciones}
              onChange={(e) => setPorciones(e.target.value)}
              min="1"
              step="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          {menus.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Agregar a menú <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <select
                value={menuId}
                onChange={(e) => setMenuId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">— Sin menú —</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setIsCreateOpen(false); setNombre(''); setPorciones('1'); setMenuId('') }}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear receta'}
            </button>
          </div>
        </form>
      </Modal>

      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} requiredPlan="basic" tipo="receta" />
    </div>
  )
}
