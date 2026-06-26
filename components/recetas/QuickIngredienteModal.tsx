'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CLASIFICACIONES, UNIDADES_MEDIDA, UNIDADES_PRESENTACION } from '@/types'
import { crearIngredienteRapido } from '@/app/(dashboard)/ingredientes/actions'
import type { Ingrediente } from '@/types'

interface Props {
  nombreInicial: string
  onCreado: (ingrediente: Ingrediente) => void
  onCerrar: () => void
}

const empty = {
  nombre: '', marca: '', proveedor: '', clasificacion: '',
  unidad_presentacion: '', cantidad_presentacion: '', unidad_medida: '', precio_compra: '',
}

export default function QuickIngredienteModal({ nombreInicial, onCreado, onCerrar }: Props) {
  const [form,    setForm]    = useState({ ...empty, nombre: nombreInicial })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [sugNombres,    setSugNombres]    = useState<string[]>([])
  const [sugMarcas,     setSugMarcas]     = useState<string[]>([])
  const [sugProveedores,setSugProveedores]= useState<string[]>([])
  const [customUnidades,       setCustomUnidades]        = useState<string[]>([])
  const [customPresentaciones, setCustomPresentaciones]  = useState<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [ingsRes, profileRes, provRes] = await Promise.all([
        supabase.from('ingredientes').select('nombre, marca'),
        supabase.from('user_profiles').select('unidades_personalizadas, presentaciones_personalizadas').eq('id', user.id).single(),
        supabase.from('proveedores').select('nombre').eq('user_id', user.id).order('nombre'),
      ])
      if (ingsRes.data) {
        setSugNombres(Array.from(new Set(ingsRes.data.map((d: any) => d.nombre).filter(Boolean))))
        setSugMarcas(Array.from(new Set(ingsRes.data.map((d: any) => d.marca).filter(Boolean))))
      }
      if (provRes.data) setSugProveedores(provRes.data.map((p: any) => p.nombre))
      if (profileRes.data) {
        setCustomUnidades(profileRes.data.unidades_personalizadas ?? [])
        setCustomPresentaciones(profileRes.data.presentaciones_personalizadas ?? [])
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allUnidades       = [...UNIDADES_MEDIDA, ...customUnidades]
  const allPresentaciones = [...UNIDADES_PRESENTACION, ...customPresentaciones]

  const precioUnitario =
    form.precio_compra && form.cantidad_presentacion && Number(form.cantidad_presentacion) > 0
      ? Number(form.precio_compra) / Number(form.cantidad_presentacion)
      : null

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // refs para Enter navigation
  const marcaRef        = useRef<HTMLInputElement>(null)
  const proveedorRef    = useRef<HTMLInputElement>(null)
  const clasificRef     = useRef<HTMLSelectElement>(null)
  const unidadPresRef   = useRef<HTMLSelectElement>(null)
  const cantidadPresRef = useRef<HTMLInputElement>(null)
  const unidadMedRef    = useRef<HTMLSelectElement>(null)
  const precioRef       = useRef<HTMLInputElement>(null)

  const goTo = (ref: React.RefObject<HTMLElement | null>) =>
    (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); (ref.current as HTMLElement)?.focus() } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim() || !form.clasificacion || !form.unidad_presentacion ||
        !form.cantidad_presentacion || !form.unidad_medida || !form.precio_compra) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    if (Number(form.cantidad_presentacion) <= 0) { setError('La cantidad debe ser mayor a 0.'); return }
    if (Number(form.precio_compra) < 0)           { setError('El precio no puede ser negativo.'); return }

    setLoading(true)
    const result = await crearIngredienteRapido({
      nombre:                form.nombre.trim(),
      marca:                 form.marca.trim() || null,
      proveedor:             form.proveedor.trim() || null,
      clasificacion:         form.clasificacion,
      unidad_presentacion:   form.unidad_presentacion,
      cantidad_presentacion: Number(form.cantidad_presentacion),
      unidad_medida:         form.unidad_medida,
      precio_compra:         Number(form.precio_compra),
    })
    setLoading(false)
    if (!result.ok) { setError(result.error); return }
    onCreado(result.ingrediente)
  }

  const inp = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white'
  const lbl = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-800">Nuevo ingrediente</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5">
          <datalist id="qc-nombres">{sugNombres.map(n => <option key={n} value={n} />)}</datalist>
          <datalist id="qc-marcas">{sugMarcas.map(m => <option key={m} value={m} />)}</datalist>
          <datalist id="qc-proveedores">{sugProveedores.map(p => <option key={p} value={p} />)}</datalist>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className={lbl}>Nombre del producto <span className="text-red-500">*</span></label>
              <input autoFocus type="text" name="nombre" value={form.nombre} onChange={set}
                onKeyDown={goTo(marcaRef)} list="qc-nombres" placeholder="Ej: Leche entera" className={inp} />
            </div>

            {/* Marca */}
            <div>
              <label className={lbl}>Marca</label>
              <input ref={marcaRef} type="text" name="marca" value={form.marca} onChange={set}
                onKeyDown={goTo(proveedorRef)} list="qc-marcas" placeholder="Ej: Lala" className={inp} />
            </div>

            {/* Proveedor */}
            <div>
              <label className={lbl}>Proveedor</label>
              <input ref={proveedorRef} type="text" name="proveedor" value={form.proveedor} onChange={set}
                onKeyDown={goTo(clasificRef)} list="qc-proveedores" placeholder="Ej: La Comercial" className={inp} />
            </div>

            {/* Clasificación */}
            <div>
              <label className={lbl}>Clasificación <span className="text-red-500">*</span></label>
              <select ref={clasificRef} name="clasificacion" value={form.clasificacion}
                onChange={set} onKeyDown={goTo(unidadPresRef)} className={inp}>
                <option value="">Seleccionar...</option>
                {CLASIFICACIONES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Tipo de presentación */}
            <div>
              <label className={lbl}>Tipo de presentación <span className="text-red-500">*</span></label>
              <select ref={unidadPresRef} name="unidad_presentacion" value={form.unidad_presentacion}
                onChange={set} onKeyDown={goTo(cantidadPresRef)} className={inp}>
                <option value="">Seleccionar...</option>
                {allPresentaciones.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Cantidad en presentación */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-slate-700">
                  Cantidad en presentación <span className="text-red-500">*</span>
                </label>
                <span className="group relative cursor-help">
                  <HelpCircle size={13} className="text-slate-400" />
                  <span className="absolute left-0 top-5 z-20 w-52 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-relaxed">
                    1 = 1 kg / 1 L / 1 Pz<br />
                    Para gramos usa decimales:<br />
                    0.200 = 200 g · 0.500 = 500 g
                  </span>
                </span>
              </div>
              <input ref={cantidadPresRef} type="number" name="cantidad_presentacion"
                value={form.cantidad_presentacion} onChange={set} onKeyDown={goTo(unidadMedRef)}
                min="0.0001" step="any" placeholder="Ej: 1" className={inp} />
            </div>

            {/* Unidad de medida */}
            <div>
              <label className={lbl}>Unidad de medida <span className="text-red-500">*</span></label>
              <select ref={unidadMedRef} name="unidad_medida" value={form.unidad_medida}
                onChange={set} onKeyDown={goTo(precioRef)} className={inp}>
                <option value="">Seleccionar...</option>
                {allUnidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Precio de compra */}
            <div>
              <label className={lbl}>Precio de compra (MXN) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 select-none">$</span>
                <input ref={precioRef} type="number" name="precio_compra" value={form.precio_compra}
                  onChange={set} min="0" step="0.01" placeholder="0.00" className={`${inp} pl-6`} />
              </div>
            </div>
          </div>

          {/* Precio unitario calculado */}
          {precioUnitario !== null && (
            <div className="mt-4 p-3 bg-brand-50 border border-brand-100 rounded-lg flex items-center justify-between">
              <span className="text-sm text-brand-700">Precio unitario calculado</span>
              <span className="text-sm font-bold text-brand-800">
                ${precioUnitario.toFixed(4)}{' '}
                <span className="font-normal text-brand-600">por {form.unidad_medida || 'unidad'}</span>
              </span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button type="button" onClick={onCerrar}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit as any} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Crear y agregar
          </button>
        </div>
      </div>
    </div>
  )
}
