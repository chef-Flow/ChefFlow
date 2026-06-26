'use server'

import { createClient } from '@/lib/supabase/server'
import type { Ingrediente } from '@/types'

export async function crearIngredienteRapido(data: {
  nombre: string
  marca: string | null
  clasificacion: string
  unidad_presentacion: string
  cantidad_presentacion: number
  unidad_medida: string
  precio_compra: number
}): Promise<{ ok: true; ingrediente: Ingrediente } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sin sesión activa.' }

  const { data: ing, error } = await supabase
    .from('ingredientes')
    .insert({ ...data, user_id: user.id, proveedor_id: null, proveedor: null })
    .select()
    .single()

  if (error || !ing) return { ok: false, error: 'No se pudo crear el ingrediente.' }

  return { ok: true, ingrediente: ing as Ingrediente }
}
