'use client'

import { useState } from 'react'
import { Plus, Truck, Pencil, Trash2, Phone, Mail, FileText, ChevronDown, ChevronUp, Package, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import type { Proveedor } from '@/types'

interface IngRow {
  id: string
  nombre: string
  marca: string | null
  precio_compra: number
  cantidad_presentacion: number
  unidad_medida: string
  unidad_presentacion: string
}

interface Props {
  initialProveedores: Proveedor[]
}

const empty: Omit<Proveedor, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  nombre: '', contacto: null, telefono: null, email: null, notas: null,
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

export default function ProveedoresList({ initialProveedores }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>(initialProveedores)
  const [isOpen, setIsOpen]           = useState(false)
  const [editing, setEditing]         = useState<Proveedor | null>(null)
  const [expanded, setExpanded]       = useState<string | null>(null)

  // ── Ingredient data per proveedor (lazy-loaded) ─────────────────────────────
  const [ingredientesMap, setIngredientesMap] = useState<Record<string, IngRow[]>>({})
  const [loadingIng, setLoadingIng]           = useState<Record<string, boolean>>({})

  const [nombre, setNombre]     = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail]       = useState('')
  const [notas, setNotas]       = useState('')
  const [loading, setLoading]   = useState(false)

  const supabase = createClient()

  // ── Expand / collapse — lazy load ingredients on first open ─────────────────
  const handleExpand = async (p: Proveedor) => {
    const newId = expanded === p.id ? null : p.id
    setExpanded(newId)

    if (newId && !(newId in ingredientesMap)) {
      setLoadingIng(prev => ({ ...prev, [newId]: true }))

      // Fetch by FK link and by name match (for legacy records without FK)
      const [byId, byName] = await Promise.all([
        supabase
          .from('ingredientes')
          .select('id, nombre, marca, precio_compra, cantidad_presentacion, unidad_medida, unidad_presentacion')
          .eq('proveedor_id', p.id)
          .order('nombre'),
        supabase
          .from('ingredientes')
          .select('id, nombre, marca, precio_compra, cantidad_presentacion, unidad_medida, unidad_presentacion')
          .ilike('proveedor', p.nombre)
          .is('proveedor_id', null)
          .order('nombre'),
      ])

      // Merge + deduplicate
      const combined = [...(byId.data ?? []), ...(byName.data ?? [])]
      const seen = new Set<string>()
      const unique = combined.filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })

      setIngredientesMap(prev => ({ ...prev, [newId]: unique as IngRow[] }))
      setLoadingIng(prev => ({ ...prev, [newId]: false }))
    }
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null); setNombre(''); setContacto(''); setTelefono(''); setEmail(''); setNotas('')
    setIsOpen(true)
  }
  const openEdit = (p: Proveedor) => {
    setEditing(p)
    setNombre(p.nombre); setContacto(p.contacto ?? ''); setTelefono(p.telefono ?? '')
    setEmail(p.email ?? ''); setNotas(p.notas ?? '')
    setIsOpen(true)
  }
  const closeModal = () => { setIsOpen(false); setEditing(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoading(true)

    const payload = {
      nombre:   nombre.trim(),
      contacto: contacto.trim() || null,
      telefono: telefono.trim() || null,
      email:    email.trim()    || null,
      notas:    notas.trim()    || null,
    }

    if (editing) {
      const { data } = await supabase.from('proveedores')
        .update(payload).eq('id', editing.id).select().single()
      if (data) {
        setProveedores(ps => ps.map(p => p.id === editing.id ? data as Proveedor : p))
        // Reset ingredient cache so it reloads with the new name
        setIngredientesMap(prev => {
          const copy = { ...prev }
          delete copy[editing.id]
          return copy
        })
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('proveedores')
        .insert({ user_id: user!.id, ...payload }).select().single()
      if (data) setProveedores(ps => [...ps, data as Proveedor])
    }

    setLoading(false); closeModal()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor? Los ingredientes no se borrarán.')) return
    await supabase.from('proveedores').delete().eq('id', id)
    setProveedores(ps => ps.filter(p => p.id !== id))
    setIngredientesMap(prev => { const c = { ...prev }; delete c[id]; return c })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm">
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      {proveedores.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Truck className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Aún no tienes proveedores.</p>
          <button onClick={openCreate} className="mt-3 text-brand-600 text-sm font-semibold hover:text-brand-700">
            Agrega tu primer proveedor →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {proveedores.map(p => {
              const ings       = ingredientesMap[p.id]
              const isLoading  = loadingIng[p.id]
              const isExpanded = expanded === p.id

              return (
                <li key={p.id}>
                  {/* ── Row header ────────────────────────────────────────── */}
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck size={16} className="text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 text-sm truncate">{p.nombre}</div>
                        {p.contacto && <div className="text-xs text-slate-400 truncate">{p.contacto}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleExpand(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title={isExpanded ? 'Ocultar detalle' : 'Ver ingredientes'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded panel ────────────────────────────────────── */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60">

                      {/* Contact info */}
                      {(p.telefono || p.email || p.notas) && (
                        <div className="px-5 py-3 ml-12 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-b border-slate-100">
                          {p.telefono && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Phone size={12} className="text-slate-400" /> {p.telefono}
                            </div>
                          )}
                          {p.email && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Mail size={12} className="text-slate-400" />
                              <a href={`mailto:${p.email}`} className="hover:text-brand-600 truncate">{p.email}</a>
                            </div>
                          )}
                          {p.notas && (
                            <div className="flex items-start gap-1.5 text-slate-600 sm:col-span-3">
                              <FileText size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="whitespace-pre-wrap">{p.notas}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ingredients section */}
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingBag size={14} className="text-slate-400" />
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Ingredientes que surte
                          </span>
                        </div>

                        {isLoading ? (
                          <p className="text-xs text-slate-400 py-2 ml-1">Cargando...</p>
                        ) : !ings || ings.length === 0 ? (
                          <div className="flex items-center gap-2 py-3 text-slate-400">
                            <Package size={16} className="flex-shrink-0" />
                            <p className="text-xs">
                              Este proveedor aún no tiene ingredientes registrados.
                              Al guardar un ingrediente con este proveedor aparecerá aquí.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto -mx-1">
                            <table className="w-full text-xs min-w-[480px]">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left pb-2 pl-1 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Ingrediente</th>
                                  <th className="text-left pb-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Presentación</th>
                                  <th className="text-right pb-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Precio compra</th>
                                  <th className="text-right pb-2 pr-1 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Precio por unidad</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {ings.map(ing => {
                                  const unitPrice = ing.precio_compra / ing.cantidad_presentacion
                                  return (
                                    <tr key={ing.id} className="hover:bg-white transition-colors">
                                      <td className="py-2 pl-1">
                                        <div className="font-medium text-slate-800">{ing.nombre}</div>
                                        {ing.marca && (
                                          <div className="text-slate-400">{ing.marca}</div>
                                        )}
                                      </td>
                                      <td className="py-2 text-slate-600">
                                        {ing.cantidad_presentacion}&nbsp;{ing.unidad_medida}
                                        <span className="text-slate-400 ml-1">({ing.unidad_presentacion})</span>
                                      </td>
                                      <td className="py-2 text-right font-medium text-slate-800">
                                        {fmt(ing.precio_compra)}
                                      </td>
                                      <td className="py-2 pr-1 text-right">
                                        <span className="font-semibold text-brand-700">{fmt(unitPrice)}</span>
                                        <span className="text-slate-400 ml-0.5">/ {ing.unidad_medida}</span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-slate-200">
                                  <td colSpan={4} className="pt-2 pl-1 text-slate-400">
                                    {ings.length} ingrediente{ings.length !== 1 ? 's' : ''}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Create / Edit modal ────────────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar proveedor' : 'Nuevo proveedor'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Distribuidora López" autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contacto</label>
            <input type="text" value={contacto} onChange={e => setContacto(e.target.value)}
              placeholder="Nombre de la persona de contacto"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                placeholder="55 1234 5678"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)}
              rows={2} placeholder="Días de entrega, condiciones de pago, etc."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !nombre.trim()}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Guardando...' : editing ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
