'use client'

import { useState, useEffect, useRef } from 'react'
import { HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  CLASIFICACIONES,
  UNIDADES_MEDIDA,
  UNIDADES_PRESENTACION,
  type Ingrediente,
} from '@/types'

interface Props {
  ingrediente?: Ingrediente | null
  onSuccess: () => void
  onCancel: () => void
}

const emptyForm = {
  nombre: '',
  marca: '',
  clasificacion: '',
  unidad_presentacion: '',
  cantidad_presentacion: '',
  unidad_medida: '',
  proveedor: '',
  precio_compra: '',
}

export default function IngredienteForm({ ingrediente, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Autocomplete suggestions
  const [sugNombres, setSugNombres]       = useState<string[]>([])
  const [sugMarcas, setSugMarcas]         = useState<string[]>([])
  const [sugProveedores, setSugProveedores] = useState<string[]>([])

  // Custom units & presentations from user_profiles
  const [customUnidades, setCustomUnidades]           = useState<string[]>([])
  const [customPresentaciones, setCustomPresentaciones] = useState<string[]>([])

  // ── Refs para navegación con teclado ──────────────────────────────────────
  const nombreRef       = useRef<HTMLInputElement>(null)
  const marcaRef        = useRef<HTMLInputElement>(null)
  const proveedorRef    = useRef<HTMLInputElement>(null)
  const clasificRef     = useRef<HTMLSelectElement>(null)
  const unidadPresRef   = useRef<HTMLSelectElement>(null)
  const cantidadPresRef = useRef<HTMLInputElement>(null)
  const unidadMedRef    = useRef<HTMLSelectElement>(null)
  const precioRef       = useRef<HTMLInputElement>(null)
  const guardarRef      = useRef<HTMLButtonElement>(null)

  const supabase = createClient()

  // ── Load autocomplete data + custom settings on mount ─────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [ingsRes, profileRes, provRes] = await Promise.all([
        supabase.from('ingredientes').select('nombre, marca'),
        supabase.from('user_profiles')
          .select('unidades_personalizadas, presentaciones_personalizadas')
          .eq('id', user.id).single(),
        supabase.from('proveedores').select('nombre').eq('user_id', user.id).order('nombre'),
      ])

      if (ingsRes.data) {
        setSugNombres(Array.from(new Set(ingsRes.data.map((d: any) => d.nombre).filter(Boolean) as string[])))
        setSugMarcas(Array.from(new Set(ingsRes.data.map((d: any) => d.marca).filter(Boolean) as string[])))
      }

      if (provRes.data) {
        setSugProveedores(provRes.data.map((p: any) => p.nombre))
      }

      if (profileRes.error) {
        console.error('[IngredienteForm] Error loading user_profiles:', JSON.stringify(profileRes.error))
      }
      if (profileRes.data) {
        setCustomUnidades(profileRes.data.unidades_personalizadas ?? [])
        setCustomPresentaciones(profileRes.data.presentaciones_personalizadas ?? [])
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (ingrediente) {
      setForm({
        nombre: ingrediente.nombre,
        marca: ingrediente.marca ?? '',
        clasificacion: ingrediente.clasificacion,
        unidad_presentacion: ingrediente.unidad_presentacion,
        cantidad_presentacion: String(ingrediente.cantidad_presentacion),
        unidad_medida: ingrediente.unidad_medida,
        proveedor: ingrediente.proveedor ?? '',
        precio_compra: String(ingrediente.precio_compra),
      })
    } else {
      setForm(emptyForm)
    }
  }, [ingrediente])

  const allUnidades       = [...UNIDADES_MEDIDA, ...customUnidades]
  const allPresentaciones = [...UNIDADES_PRESENTACION, ...customPresentaciones]

  const precioUnitario =
    form.precio_compra && form.cantidad_presentacion && Number(form.cantidad_presentacion) > 0
      ? Number(form.precio_compra) / Number(form.cantidad_presentacion)
      : null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // ── Helper: mover foco al siguiente campo con Enter ───────────────────────
  const goTo = (ref: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>) =>
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        ref.current?.focus()
      }
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (
      !form.nombre.trim() ||
      !form.clasificacion ||
      !form.unidad_presentacion ||
      !form.cantidad_presentacion ||
      !form.unidad_medida ||
      !form.precio_compra
    ) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }

    if (Number(form.cantidad_presentacion) <= 0) {
      setError('La cantidad de presentación debe ser mayor a 0.')
      return
    }

    if (Number(form.precio_compra) < 0) {
      setError('El precio de compra no puede ser negativo.')
      return
    }

    setLoading(true)

    const payload = {
      nombre: form.nombre.trim(),
      marca: form.marca.trim() || null,
      clasificacion: form.clasificacion,
      unidad_presentacion: form.unidad_presentacion,
      cantidad_presentacion: Number(form.cantidad_presentacion),
      unidad_medida: form.unidad_medida,
      proveedor: form.proveedor.trim() || null,
      precio_compra: Number(form.precio_compra),
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    if (ingrediente) {
      const { error: dbError } = await supabase
        .from('ingredientes').update(payload).eq('id', ingrediente.id)
      if (dbError) {
        setError('Error al actualizar el ingrediente. Intenta de nuevo.')
        setLoading(false); return
      }
    } else {
      const { error: dbError } = await supabase
        .from('ingredientes').insert({ ...payload, user_id: user.id })
      if (dbError) {
        setError('Error al guardar el ingrediente. Intenta de nuevo.')
        setLoading(false); return
      }
    }

    // Auto-create proveedor in the proveedores table if it's new
    if (payload.proveedor) {
      const nombreProveedor = payload.proveedor
      const { data: existing } = await supabase
        .from('proveedores')
        .select('id')
        .eq('user_id', user.id)
        .ilike('nombre', nombreProveedor)
        .maybeSingle()

      if (!existing) {
        await supabase.from('proveedores').insert({
          user_id: user.id,
          nombre: nombreProveedor,
        })
        setSugProveedores(prev =>
          Array.from(new Set([...prev, nombreProveedor])).sort(),
        )
      }
    }

    setLoading(false)
    onSuccess()
  }

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition bg-white'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datalists for autocomplete */}
      <datalist id="dl-nombres">
        {sugNombres.map(n => <option key={n} value={n} />)}
      </datalist>
      <datalist id="dl-marcas">
        {sugMarcas.map(m => <option key={m} value={m} />)}
      </datalist>
      <datalist id="dl-proveedores">
        {sugProveedores.map(p => <option key={p} value={p} />)}
      </datalist>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="sm:col-span-2">
          <label className={labelClass}>
            Nombre del producto <span className="text-red-500">*</span>
          </label>
          <input
            ref={nombreRef}
            type="text" name="nombre" value={form.nombre} onChange={handleChange}
            onKeyDown={goTo(marcaRef)}
            list="dl-nombres"
            placeholder="Ej: Leche entera"
            className={inputClass}
          />
        </div>

        {/* Marca */}
        <div>
          <label className={labelClass}>Marca</label>
          <input
            ref={marcaRef}
            type="text" name="marca" value={form.marca} onChange={handleChange}
            onKeyDown={goTo(proveedorRef)}
            list="dl-marcas"
            placeholder="Ej: Lala"
            className={inputClass}
          />
        </div>

        {/* Proveedor */}
        <div>
          <label className={labelClass}>Proveedor</label>
          <input
            ref={proveedorRef}
            type="text" name="proveedor" value={form.proveedor} onChange={handleChange}
            onKeyDown={goTo(clasificRef)}
            list="dl-proveedores"
            placeholder="Ej: La Comercial"
            className={inputClass}
          />
        </div>

        {/* Clasificación */}
        <div>
          <label className={labelClass}>
            Clasificación <span className="text-red-500">*</span>
          </label>
          <select
            ref={clasificRef}
            name="clasificacion" value={form.clasificacion}
            onChange={handleChange} onKeyDown={goTo(unidadPresRef)}
            className={inputClass}
          >
            <option value="">Seleccionar...</option>
            {CLASIFICACIONES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Presentación */}
        <div>
          <label className={labelClass}>
            Tipo de presentación <span className="text-red-500">*</span>
          </label>
          <select
            ref={unidadPresRef}
            name="unidad_presentacion" value={form.unidad_presentacion}
            onChange={handleChange} onKeyDown={goTo(cantidadPresRef)}
            className={inputClass}
          >
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
                1 = 1&nbsp;kg / 1&nbsp;L / 1&nbsp;Pz<br />
                Para gramos usa decimales:<br />
                0.200 = 200&nbsp;g · 0.500 = 500&nbsp;g
              </span>
            </span>
          </div>
          <input
            ref={cantidadPresRef}
            type="number" name="cantidad_presentacion" value={form.cantidad_presentacion}
            onChange={handleChange} onKeyDown={goTo(unidadMedRef)}
            min="0.0001" step="any" placeholder="Ej: 1"
            className={inputClass}
          />
        </div>

        {/* Unidad de medida */}
        <div>
          <label className={labelClass}>
            Unidad de medida <span className="text-red-500">*</span>
          </label>
          <select
            ref={unidadMedRef}
            name="unidad_medida" value={form.unidad_medida}
            onChange={handleChange} onKeyDown={goTo(precioRef)}
            className={inputClass}
          >
            <option value="">Seleccionar...</option>
            {allUnidades.map(u => <option key={u} value={u}>{u}</option>)}
            {ingrediente && !allUnidades.includes(ingrediente.unidad_medida) && (
              <option value={ingrediente.unidad_medida}>{ingrediente.unidad_medida}</option>
            )}
          </select>
        </div>

        {/* Precio de compra */}
        <div>
          <label className={labelClass}>
            Precio de compra (MXN) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 select-none">$</span>
            <input
              ref={precioRef}
              type="number" name="precio_compra" value={form.precio_compra}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); guardarRef.current?.click() }
              }}
              min="0" step="0.01" placeholder="0.00"
              className={`${inputClass} pl-6`}
            />
          </div>
        </div>
      </div>

      {/* Precio unitario calculado */}
      {precioUnitario !== null && (
        <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg flex items-center justify-between">
          <span className="text-sm text-brand-700">Precio unitario calculado</span>
          <span className="text-sm font-bold text-brand-800">
            ${precioUnitario.toFixed(4)}{' '}
            <span className="font-normal text-brand-600">
              por {form.unidad_medida || 'unidad'}
            </span>
          </span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button ref={guardarRef} type="submit" disabled={loading}
          className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Guardando...' : ingrediente ? 'Actualizar' : 'Agregar ingrediente'}
        </button>
      </div>
    </form>
  )
}
