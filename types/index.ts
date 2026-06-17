// ─── Constants ────────────────────────────────────────────────────────────────

export const CLASIFICACIONES = [
  'Abarrotes','Aceites y Grasas','Bebidas','Carnes','Desechables','Embutidos',
  'Especias y Condimentos','Frutas y verduras','Lácteos','Mariscos','Panadería','Otros',
] as const
export type Clasificacion = (typeof CLASIFICACIONES)[number]

export const UNIDADES_MEDIDA       = ['kg', 'L', 'Pz', 'oz', 'lb'] as const
export type UnidadMedida           = (typeof UNIDADES_MEDIDA)[number]

export const UNIDADES_RENDIMIENTO  = ['kg', 'g', 'L', 'ml', 'Pz'] as const

export const UNIDADES_PRESENTACION = [
  'A granel','Bolsa','Botella','Caja','Costal','Cubeta','Kg','Lata','Litro','Pieza','Sobre','Otro',
] as const

export const FREE_PLAN_LIMIT       = 3

export const MENU_COLORS = [
  '#f97316','#ef4444','#a855f7','#3b82f6','#10b981','#f59e0b','#ec4899','#6366f1',
] as const

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Ingrediente {
  id: string
  user_id: string
  nombre: string
  marca: string | null
  unidad_presentacion: string
  cantidad_presentacion: number
  unidad_medida: string
  clasificacion: string
  proveedor: string | null
  proveedor_id: string | null
  precio_compra: number
  created_at: string
  updated_at: string
}
export type IngredienteInsert = Omit<Ingrediente, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export interface SubReceta {
  id: string; user_id: string; nombre: string
  rendimiento: number; unidad_rendimiento: string; costo_total: number
  margen_seguridad: number   // % buffer aplicado al costo para mostrar el costo ajustado
  created_at: string; updated_at: string
}

export interface Receta {
  id: string; user_id: string; nombre: string
  porciones: number; costo_total: number; costo_por_porcion: number
  precio_venta: number | null
  plataforma_delivery_id: string | null
  foto_url: string | null
  notas: string | null
  margen_seguridad: number   // % buffer aplicado al costo al calcular el precio sugerido
  created_at: string; updated_at: string
}

export interface IngredienteSubreceta {
  id: string; sub_receta_id: string; ingrediente_id: string
  cantidad_neta: number; peso_merma: number
  porcentaje_merma: number; cantidad_bruta: number; costo: number
  precio_unitario_capturado: number | null
  created_at: string
}

export interface IngredienteReceta {
  id: string; receta_id: string
  ingrediente_id: string | null; sub_receta_id: string | null
  cantidad_neta: number; peso_merma: number
  porcentaje_merma: number; cantidad_bruta: number; costo: number
  precio_unitario_capturado: number | null
  created_at: string
}

// ─── Settings / plan ──────────────────────────────────────────────────────────

export type Plan = 'free' | 'basic' | 'pro'

export interface UserProfile {
  id: string; plan: Plan
  iva_porcentaje: number; margen_minimo: number; comision_bancaria: number
  unidades_personalizadas: string[]
  presentaciones_personalizadas: string[]
  cancelled: boolean
  subscription_end_date: string | null
  created_at: string; updated_at: string
}

// ─── New v3 entities ──────────────────────────────────────────────────────────

export interface Menu {
  id: string; user_id: string; nombre: string
  descripcion: string | null; color: string; orden: number
  margen_minimo: number | null   // null = usar el global de user_profiles
  created_at: string; updated_at: string
}

export interface MenuConRecetas extends Menu {
  menu_recetas: {
    id: string
    receta:     { id: string; nombre: string } | null
    sub_receta: { id: string; nombre: string } | null
  }[]
}

export interface MenuReceta {
  id: string; menu_id: string; receta_id: string; orden: number; created_at: string
}

export interface Proveedor {
  id: string; user_id: string; nombre: string
  contacto: string | null; telefono: string | null; email: string | null; notas: string | null
  created_at: string; updated_at: string
}

export interface PlataformaDelivery {
  id: string; user_id: string; nombre: string
  comision_porcentaje: number; activa: boolean
  created_at: string; updated_at: string
}

export interface Colaborador {
  id: string; propietario_id: string; colaborador_user_id: string | null
  email: string; estado: 'pendiente' | 'activo' | 'revocado'; token: string
  created_at: string
}

export interface ColaboradorMenu {
  id: string; colaborador_id: string; menu_id: string
  puede_ver_recetas: boolean; puede_ver_precios: boolean
  puede_ver_proveedores: boolean; puede_editar: boolean
}
