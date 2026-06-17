import { z } from 'zod'

export const emailSchema = z.string().email('Correo electrónico inválido').max(255)

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga')

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const uuidSchema = z.string().uuid('ID inválido')

export const notasSchema = z.string().max(5000, 'Las notas no pueden exceder 5000 caracteres')

export const nombreSchema = z
  .string()
  .min(1, 'El nombre es requerido')
  .max(255, 'El nombre es demasiado largo')
  .transform(s => s.trim())

export const porcentajeSchema = z
  .number()
  .min(0, 'El porcentaje no puede ser negativo')
  .max(100, 'El porcentaje no puede exceder 100')

export const precioSchema = z
  .number()
  .min(0, 'El precio no puede ser negativo')
  .max(9_999_999, 'El precio es demasiado alto')

export const profileParamsSchema = z.object({
  iva_porcentaje:    porcentajeSchema,
  margen_minimo:     porcentajeSchema,
  comision_bancaria: porcentajeSchema,
})

export const plataformaSchema = z.object({
  nombre:              nombreSchema,
  comision_porcentaje: porcentajeSchema,
})

export const analisisSchema = z.object({
  receta_id:  uuidSchema,
  precio_venta: precioSchema.nullable(),
})

export const fotoUrlSchema = z
  .string()
  .url('URL inválida')
  .max(2048)
  .refine(
    url => url.includes('.supabase.co/storage/'),
    'La URL de foto debe provenir del almacenamiento de ChefFlow',
  )
