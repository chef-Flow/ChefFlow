'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Layers, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import PaywallModal from '@/components/paywall/PaywallModal'
import { useUserPlan } from '@/lib/hooks/useUserPlan'
import { UNIDADES_RENDIMIENTO, type SubReceta, type Menu } from '@/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

interface Props {
  initialSubRecetas: SubReceta[]
  menus: Pick<Menu, 'id' | 'nombre' | 'color'>[]
}

export default function SubRecetasList({ initialSubRecetas, menus }: Props) {
  const [subRecetas, setSubRecetas] = useState<SubReceta[]>(initialSubRecetas)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [rendimiento, setRendimiento] = useState('1')
  const [unidadRendimiento, setUnidadRendimiento] = useState('kg')
  const [menuId, setMenuId] = useState('')
  const [loading, setLoading] = useState(false)
  const plan = useUserPlan()
  const supabase = createClient()

  const fetch = async () => {
    const { data } = await supabase.from('sub_recetas').select('*').order('nombre')
    if (data) setSubRecetas(data as SubReceta[])
  }

  const handleClickNueva = () => {
    if (!plan.canCreateSubReceta) {
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

    const { data: newSR } = await supabase
      .from('sub_recetas')
      .insert({
        user_id: user!.id,
        nombre: nombre.trim(),
        rendimiento: Number(rendimiento) || 1,
        unidad_rendimiento: unidadRendimiento,
      })
      .select('id')
      .single()

    if (newSR && menuId) {
      await supabase.from('menu_recetas').insert({
        menu_id: menuId,
        sub_receta_id: newSR.id,
        orden: 0,
      })
    }

    await fetch()
    plan.refresh()
    setLoading(false)
    setIsCreateOpen(false)
    setNombre('')
    setRendimiento('1')
    setUnidadRendimiento('kg')
    setMenuId('')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sub-Recetas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {subRecetas.length} sub-receta{subRecetas.length !== 1 ? 's' : ''} registrada
            {subRecetas.length !== 1 ? 's' : ''}
            {plan.plan === 'free' && (
              <span className="ml-2 text-amber-600 font-medium">
                ({plan.subRecetasCount}/3 plan gratuito)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleClickNueva}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          {plan.canCreateSubReceta ? <Plus size={16} /> : <Lock size={15} />}
          Nueva sub-receta
        </button>
      </div>

      {/* Explanation banner */}
      <div className="mb-5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        Las sub-recetas son <strong>preparaciones base</strong> (ej: masa de pan, carne
        marinada) con su propio costo. Puedes usarlas como ingrediente en otras recetas.
      </div>

      {/* List */}
      {subRecetas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Layers className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Aún no tienes sub-recetas.</p>
          <button
            onClick={handleClickNueva}
            className="mt-3 text-brand-600 text-sm font-semibold hover:text-brand-700"
          >
            Crea tu primera sub-receta →
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subRecetas.map((sr) => {
            const costoPorUnidad =
              sr.rendimiento > 0 ? sr.costo_total / sr.rendimiento : 0

            return (
              <Link
                key={sr.id}
                href={`/sub-recetas/${sr.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers size={16} className="text-blue-500" />
                  </div>
                  <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors text-sm">
                    {sr.nombre}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">Rendimiento</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {sr.rendimiento} {sr.unidad_rendimiento}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Costo total</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {fmt(sr.costo_total)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Costo/{sr.unidad_rendimiento}</div>
                    <div className="font-bold text-brand-600 mt-0.5">
                      {fmt(costoPorUnidad)}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setNombre(''); setRendimiento('1'); setUnidadRendimiento('kg'); setMenuId('') }} title="Nueva sub-receta" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Carne de hamburguesa"
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rendimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={rendimiento}
                onChange={(e) => setRendimiento(e.target.value)}
                min="0.0001"
                step="any"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unidad
              </label>
              <select
                value={unidadRendimiento}
                onChange={(e) => setUnidadRendimiento(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                {UNIDADES_RENDIMIENTO.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Ej: si esta sub-receta produce 2 kg de carne marinada, escribe 2 y selecciona kg.
          </p>
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
              onClick={() => { setIsCreateOpen(false); setNombre(''); setRendimiento('1'); setUnidadRendimiento('kg'); setMenuId('') }}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} requiredPlan="basic" tipo="sub-receta" />
    </div>
  )
}
