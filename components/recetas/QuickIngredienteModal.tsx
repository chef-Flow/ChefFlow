'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { CLASIFICACIONES, UNIDADES_MEDIDA } from '@/types'
import { crearIngredienteRapido } from '@/app/(dashboard)/ingredientes/actions'
import type { Ingrediente } from '@/types'

const UNIDAD_A_PRESENTACION: Record<string, string> = {
  kg: 'Kg', L: 'Litro', Pz: 'Pieza', oz: 'Otro', lb: 'Otro',
}

interface Props {
  nombreInicial: string
  onCreado: (ingrediente: Ingrediente) => void
  onCerrar: () => void
}

export default function QuickIngredienteModal({ nombreInicial, onCreado, onCerrar }: Props) {
  const [nombre,        setNombre]        = useState(nombreInicial)
  const [clasificacion, setClasificacion] = useState('')
  const [unidad,        setUnidad]        = useState<string>('')
  const [cantidad,      setCantidad]      = useState('1')
  const [precio,        setPrecio]        = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const valid = nombre.trim() && clasificacion && unidad && Number(cantidad) > 0 && Number(precio) > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    setError(null)

    const result = await crearIngredienteRapido({
      nombre:               nombre.trim(),
      marca:                null,
      clasificacion,
      unidad_medida:        unidad,
      unidad_presentacion:  UNIDAD_A_PRESENTACION[unidad] ?? 'Otro',
      cantidad_presentacion: Number(cantidad),
      precio_compra:        Number(precio),
    })

    setLoading(false)
    if (!result.ok) { setError(result.error); return }
    onCreado(result.ingrediente)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Nuevo ingrediente</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
            <input
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ej. Tomate cherry"
            />
          </div>

          {/* Clasificación */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clasificación *</label>
            <select
              value={clasificacion}
              onChange={e => setClasificacion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Selecciona…</option>
              {CLASIFICACIONES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Unidad + Cantidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unidad *</label>
              <select
                value={unidad}
                onChange={e => setUnidad(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">—</option>
                {UNIDADES_MEDIDA.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad *</label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="1"
              />
            </div>
          </div>

          {/* Precio */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Precio de compra (MXN) *
              {unidad && Number(cantidad) > 0 && (
                <span className="ml-1 text-slate-400 font-normal">
                  — por {cantidad} {unidad}
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="any"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valid || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Crear y agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
