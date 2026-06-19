'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Share2, Loader2, Check, UserX, ChevronDown, DollarSign, Truck } from 'lucide-react'
import {
  compartirReceta,
  revocarRecetaCompartida,
  getContactosCompartir,
  getSharesDeReceta,
} from '@/app/(dashboard)/recetas/compartir-actions'

interface Share {
  id: string
  receptor_email: string
  estado: string
  puede_ver_precios: boolean
  puede_ver_proveedores: boolean
  created_at: string
}

interface Props {
  recetaId: string
  recetaNombre: string
  onClose: () => void
}

export default function CompartirRecetaModal({ recetaId, recetaNombre, onClose }: Props) {
  const [email, setEmail]                   = useState('')
  const [puedeVerPrecios, setPuedeVerPrecios]         = useState(false)
  const [puedeVerProveedores, setPuedeVerProveedores] = useState(false)
  const [loading, setLoading]               = useState(false)
  const [success, setSuccess]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [shares, setShares]                 = useState<Share[]>([])
  const [contactos, setContactos]           = useState<{ email: string; nombre: string | null }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [revoking, setRevoking]             = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      getContactosCompartir(),
      getSharesDeReceta(recetaId),
    ]).then(([c, s]) => {
      setContactos(c)
      setShares(s)
    })
    inputRef.current?.focus()
  }, [recetaId])

  const suggestions = email.length >= 2
    ? contactos.filter(c => c.email.includes(email.toLowerCase()) && c.email !== email.toLowerCase())
    : contactos.filter(c => c.email !== email.toLowerCase())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    const res = await compartirReceta(recetaId, email, { puedeVerPrecios, puedeVerProveedores })
    setLoading(false)

    if (!res.ok) {
      setError(res.error ?? 'Error al compartir')
      return
    }

    setSuccess(true)
    setEmail('')
    setPuedeVerPrecios(false)
    setPuedeVerProveedores(false)
    // Refresh shares list
    const updated = await getSharesDeReceta(recetaId)
    setShares(updated)
    // Refresh contacts
    const updatedContacts = await getContactosCompartir()
    setContactos(updatedContacts)
    if (res.error) setError(res.error) // partial success (email failed)
  }

  const handleRevoke = async (shareId: string) => {
    setRevoking(shareId)
    const res = await revocarRecetaCompartida(shareId)
    setRevoking(null)
    if (res.ok) {
      setShares(s => s.filter(x => x.id !== shareId))
    } else {
      alert(res.error ?? 'Error al revocar')
    }
  }

  const activeShares = shares.filter(s => s.estado !== 'revocado')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Share2 size={17} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Compartir receta</h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">{recetaNombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input with suggestions */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Correo del destinatario
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setShowSuggestions(true); setSuccess(false) }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  required
                />
                {contactos.length > 0 && (
                  <button
                    type="button"
                    onMouseDown={() => setShowSuggestions(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    <ChevronDown size={15} />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map(c => (
                    <button
                      key={c.email}
                      type="button"
                      onMouseDown={() => { setEmail(c.email); setShowSuggestions(false) }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-sm text-slate-800">{c.email}</p>
                      {c.nombre && <p className="text-xs text-slate-400">{c.nombre}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Permissions */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Permisos</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <DollarSign size={15} className="text-slate-400" />
                    <span className="text-sm text-slate-700">Ver costos y precios</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={puedeVerPrecios}
                    onChange={e => setPuedeVerPrecios(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                </label>
                <label className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Truck size={15} className="text-slate-400" />
                    <span className="text-sm text-slate-700">Ver proveedores</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={puedeVerProveedores}
                    onChange={e => setPuedeVerProveedores(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <Check size={13} /> Receta compartida correctamente
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
              {loading ? 'Enviando…' : 'Compartir receta'}
            </button>
          </form>

          {/* Current shares */}
          {activeShares.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Compartida con
              </p>
              <ul className="space-y-1.5">
                {activeShares.map(s => (
                  <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{s.receptor_email}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${s.estado === 'activo' ? 'bg-green-400' : 'bg-amber-400'}`} />
                        {s.estado === 'activo' ? 'Activa' : 'Pendiente'}
                        {s.puede_ver_precios && ' · Ve precios'}
                        {s.puede_ver_proveedores && ' · Ve proveedores'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      disabled={revoking === s.id}
                      className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Revocar acceso"
                    >
                      {revoking === s.id
                        ? <Loader2 size={14} className="animate-spin text-slate-400" />
                        : <UserX size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
