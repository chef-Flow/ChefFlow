'use client'

import { useState } from 'react'
import { Plus, Users, Mail, Trash2, UserX, Shield, Lock, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { invitarColaborador, reenviarInvitacion } from '@/app/(dashboard)/colaboradores/invite-actions'
import type { Colaborador, Menu, ColaboradorMenu } from '@/types'

interface ColabWithPerms extends Colaborador {
  permisos: ColaboradorMenu[]
}

interface Props {
  initialColabs: ColabWithPerms[]
  menus: Menu[]
  ownerPlan: 'free' | 'basic' | 'pro'
}

const estadoBadge = (estado: Colaborador['estado']) => {
  if (estado === 'activo')    return { label: 'Activo',    cls: 'bg-green-100 text-green-700' }
  if (estado === 'pendiente') return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'Revocado', cls: 'bg-red-100 text-red-600' }
}

export default function ColaboradoresList({ initialColabs, menus, ownerPlan }: Props) {
  const [colabs, setColabs] = useState<ColabWithPerms[]>(initialColabs)
  const [isOpen, setIsOpen]         = useState(false)

  // Pro = colaboradores ilimitados. Free/Básico = máximo 1 colaborador activo o pendiente
  const activeColabs = colabs.filter(c => c.estado !== 'revocado')
  const canInviteMore = ownerPlan === 'pro' || activeColabs.length < 1
  const [permsOpen, setPermsOpen]   = useState<ColabWithPerms | null>(null)
  const [email, setEmail]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [reenvioId, setReenvioId]     = useState<string | null>(null)
  const [permsSaving, setPermsSaving] = useState(false)
  const supabase = createClient()

  // Local perm state for the editing modal
  const [localPerms, setLocalPerms] = useState<ColaboradorMenu[]>([])

  const openPerms = (c: ColabWithPerms) => {
    // Pre-fill with existing perms or blank defaults for each menu
    const filled: ColaboradorMenu[] = menus.map(m => {
      const existing = c.permisos.find(p => p.menu_id === m.id)
      return existing ?? {
        id: '',
        colaborador_id: c.id,
        menu_id: m.id,
        puede_ver_recetas: true,
        puede_ver_precios: false,
        puede_ver_proveedores: false,
        puede_editar: false,
      }
    })
    setLocalPerms(filled)
    setPermsOpen(c)
  }

  const togglePerm = (menuId: string, field: keyof ColaboradorMenu) => {
    setLocalPerms(ps => ps.map(p =>
      p.menu_id === menuId ? { ...p, [field]: !p[field as keyof ColaboradorMenu] } : p
    ))
  }

  const savePerms = async () => {
    if (!permsOpen) return
    setPermsSaving(true)

    for (const perm of localPerms) {
      const { menu_id, puede_ver_recetas, puede_ver_precios, puede_ver_proveedores, puede_editar } = perm
      const payload = { colaborador_id: permsOpen.id, menu_id, puede_ver_recetas, puede_ver_precios, puede_ver_proveedores, puede_editar }
      if (perm.id) {
        await supabase.from('colaborador_menus').update(payload).eq('id', perm.id)
      } else {
        await supabase.from('colaborador_menus').upsert(payload, { onConflict: 'colaborador_id,menu_id' })
      }
    }

    // Refresh perms for this colab
    const { data } = await supabase.from('colaborador_menus').select('*').eq('colaborador_id', permsOpen.id)
    setColabs(cs => cs.map(c => c.id === permsOpen.id ? { ...c, permisos: (data as ColaboradorMenu[]) ?? [] } : c))
    setPermsSaving(false)
    setPermsOpen(null)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)

    const result = await invitarColaborador(email.trim())

    if (!result.ok && !result.colab) {
      alert(result.error ?? 'No se pudo invitar al colaborador.')
      setLoading(false)
      return
    }

    if (result.colab) {
      setColabs(cs => [...cs, result.colab!])
      setEmail('')
      setIsOpen(false)
    }

    if (result.error) {
      // Correo falló pero el registro se creó
      alert(result.error)
    }

    setLoading(false)
  }

  const handleReenviar = async (colaboradorId: string) => {
    setReenvioId(colaboradorId)
    const result = await reenviarInvitacion(colaboradorId)
    setReenvioId(null)
    if (!result.ok) {
      alert(result.error ?? 'No se pudo reenviar el correo.')
    } else {
      alert('Correo de invitación reenviado.')
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Revocar acceso a este colaborador?')) return
    await supabase.from('colaboradores').update({ estado: 'revocado' }).eq('id', id)
    setColabs(cs => cs.map(c => c.id === id ? { ...c, estado: 'revocado' } : c))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta invitación?')) return
    await supabase.from('colaboradores').delete().eq('id', id)
    setColabs(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Colaboradores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Invita personas a ver tus menús con permisos personalizados
          </p>
        </div>
        {canInviteMore ? (
          <button onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={16} /> Invitar colaborador
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-semibold cursor-not-allowed"
            title="Plan Básico incluye 1 colaborador. Actualiza a Pro para colaboradores ilimitados.">
            <Lock size={15} /> Límite alcanzado · Pro
          </div>
        )}
      </div>

      {colabs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Users className="mx-auto mb-3 text-slate-200" size={52} />
          <p className="text-slate-500 font-medium text-sm">Aún no tienes colaboradores.</p>
          <button onClick={() => setIsOpen(true)} className="mt-3 text-brand-600 text-sm font-semibold hover:text-brand-700">
            Invitar ahora →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {colabs.map(c => {
              const badge = estadoBadge(c.estado)
              return (
                <li key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-indigo-500">
                        {c.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">{c.email}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {c.permisos.length > 0
                          ? `Acceso a ${c.permisos.length} menú${c.permisos.length !== 1 ? 's' : ''}`
                          : 'Sin permisos de menús asignados'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {menus.length > 0 && (
                      <button onClick={() => openPerms(c)}
                        title="Gestionar permisos"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Shield size={14} />
                      </button>
                    )}
                    {c.estado === 'pendiente' && (
                      <button
                        onClick={() => handleReenviar(c.id)}
                        disabled={reenvioId === c.id}
                        title="Reenviar invitación"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 disabled:opacity-40">
                        <Send size={14} />
                      </button>
                    )}
                    {c.estado === 'activo' && (
                      <button onClick={() => handleRevoke(c.id)} title="Revocar acceso"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                        <UserX size={14} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(c.id)} title="Eliminar"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Invite modal */}
      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEmail('') }}
        title="Invitar colaborador" size="sm">
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-slate-500">
            El colaborador recibirá un correo con un enlace para aceptar la invitación. Podrás definir sus permisos después.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="colaborador@ejemplo.com" autoFocus
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setIsOpen(false); setEmail('') }}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !email.trim()}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Enviando...' : 'Invitar y enviar correo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permissions modal */}
      <Modal isOpen={!!permsOpen} onClose={() => setPermsOpen(null)}
        title="Permisos por menú" size="sm">
        {permsOpen && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Define qué puede ver/hacer <strong>{permsOpen.email}</strong> en cada menú.
            </p>

            {menus.length === 0 ? (
              <p className="text-sm text-slate-400">No tienes menús creados aún.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {menus.map(m => {
                  const perm = localPerms.find(p => p.menu_id === m.id)
                  if (!perm) return null
                  return (
                    <div key={m.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                        <span className="text-sm font-medium text-slate-800">{m.nombre}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ['puede_ver_recetas',     'Ver recetas',    false],
                          ['puede_ver_precios',     'Ver precios',    false],
                          ['puede_ver_proveedores', 'Ver proveedores',false],
                          ['puede_editar',          'Editar',         true],
                        ] as const).map(([field, label, requiresPro]) => {
                          const locked = requiresPro && ownerPlan !== 'pro'
                          return (
                            <label key={field} className={`flex items-center gap-2 text-xs ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                              title={locked ? 'Requiere Plan Pro para activar permisos de edición' : undefined}>
                              <input type="checkbox"
                                checked={perm[field] as boolean}
                                onChange={() => !locked && togglePerm(m.id, field)}
                                disabled={locked}
                                className="w-3.5 h-3.5 accent-brand-500 disabled:cursor-not-allowed" />
                              <span className="text-slate-600">{label}</span>
                              {locked && <span className="text-brand-400 font-semibold">Pro</span>}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPermsOpen(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={savePerms} disabled={permsSaving}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {permsSaving ? 'Guardando...' : 'Guardar permisos'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
