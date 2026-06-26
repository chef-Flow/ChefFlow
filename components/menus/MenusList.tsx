'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, UtensilsCrossed, Pencil, Trash2, AlertCircle, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import PaywallModal from '@/components/paywall/PaywallModal'
import type { MenuConRecetas } from '@/types'
import { MENU_COLORS } from '@/types'
import { crearMenu, eliminarMenu } from '@/app/(dashboard)/menus/actions'

interface Props {
  initialMenus: MenuConRecetas[]
  plan: 'free' | 'basic' | 'pro'
}

export default function MenusList({ initialMenus, plan }: Props) {
  const [menus, setMenus]               = useState<MenuConRecetas[]>(initialMenus)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [editingMenu, setEditingMenu]   = useState<MenuConRecetas | null>(null)
  const [nombre, setNombre]             = useState('')
  const [descripcion, setDescripcion]   = useState('')
  const [color, setColor]               = useState<string>(MENU_COLORS[0])
  const [loading, setLoading]           = useState(false)
  const [errMsg, setErrMsg]             = useState<string | null>(null)
  const router  = useRouter()
  const supabase = createClient()
  const canCreateMenu = plan === 'basic' || plan === 'pro' || menus.length < 1

  const resetForm = () => { setNombre(''); setDescripcion(''); setColor(MENU_COLORS[0]); setErrMsg(null) }

  const openCreate = () => {
    if (!canCreateMenu) { setIsPaywallOpen(true); return }
    resetForm(); setEditingMenu(null); setIsCreateOpen(true)
  }
  const openEdit   = (m: MenuConRecetas) => {
    setEditingMenu(m)
    setNombre(m.nombre); setDescripcion(m.descripcion ?? ''); setColor(m.color); setErrMsg(null)
    setIsCreateOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoading(true); setErrMsg(null)

    if (editingMenu) {
      // ── Edit existing menu ─────────────────────────────────────────────────
      const { data, error } = await supabase.from('menus')
        .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, color })
        .eq('id', editingMenu.id)
        .select('id, nombre, descripcion, color, orden, user_id, created_at, updated_at')
        .single()

      if (error || !data) {
        setErrMsg('No se pudo guardar el menú. Intenta de nuevo.')
        setLoading(false); return
      }
      // Preserve existing menu_recetas locally
      setMenus(ms => ms.map(m =>
        m.id === editingMenu.id
          ? { ...data, menu_recetas: editingMenu.menu_recetas } as MenuConRecetas
          : m,
      ))
      setLoading(false); setIsCreateOpen(false); resetForm(); setEditingMenu(null)

    } else {
      // ── Create new menu via server action → revalidates layout ────────────
      const result = await crearMenu(nombre.trim(), descripcion.trim() || null, color)

      if (!result.ok) {
        setErrMsg(result.error)
        setLoading(false); return
      }

      setLoading(false); setIsCreateOpen(false); resetForm()
      router.push(`/menus/${result.menuId}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este menú? Las recetas no se borrarán.')) return
    setMenus(ms => ms.filter(m => m.id !== id))
    await eliminarMenu(id)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menús</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Organiza tus recetas en menús o cartas
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm">
          {canCreateMenu ? <Plus size={16} /> : <Lock size={15} />}
          Nuevo menú
        </button>
      </div>

      {menus.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <UtensilsCrossed className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Aún no tienes menús.</p>
          <button onClick={openCreate} className="mt-3 text-brand-600 text-sm font-semibold hover:text-brand-700">
            Crea tu primer menú →
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="h-1.5" style={{ backgroundColor: m.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link href={`/menus/${m.id}`} className="flex-1 group/title">
                    <h3 className="font-semibold text-slate-900 group-hover/title:text-brand-600 transition-colors">
                      {m.nombre}
                    </h3>
                    {m.descripcion && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{m.descripcion}</p>
                    )}
                  </Link>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="text-xs text-slate-400">
                    {m.menu_recetas.length} elemento{m.menu_recetas.length !== 1 ? 's' : ''}
                  </span>
                  {m.menu_recetas.slice(0, 3).map(mr => {
                    const label = mr.receta?.nombre ?? mr.sub_receta?.nombre
                    if (!label) return null
                    return (
                      <span key={mr.id} className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {label}
                      </span>
                    )
                  })}
                  {m.menu_recetas.length > 3 && (
                    <span className="text-xs text-slate-400">+{m.menu_recetas.length - 3} más</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setEditingMenu(null); setErrMsg(null) }}
        title={editingMenu ? 'Editar menú' : 'Nuevo menú'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle size={15} className="flex-shrink-0" />
              {errMsg}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Carta de verano" autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (opcional)</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              rows={2} placeholder="Breve descripción del menú..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {MENU_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {!editingMenu && (
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              Al crear el menú serás redirigido a su detalle para agregar recetas.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setIsCreateOpen(false); setEditingMenu(null); setErrMsg(null) }}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !nombre.trim()}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Guardando...' : editingMenu ? 'Guardar' : 'Crear menú →'}
            </button>
          </div>
        </form>
      </Modal>

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        requiredPlan="basic"
        message="Los menús están disponibles desde el Plan Básico. Organiza tus recetas en cartas y menús digitales."
      />
    </div>
  )
}
