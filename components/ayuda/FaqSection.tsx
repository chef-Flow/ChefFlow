'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FaqItem {
  q: string
  a: string
}

interface FaqCategory {
  label: string
  items: FaqItem[]
}

const FAQ: FaqCategory[] = [
  {
    label: 'Recetas',
    items: [
      {
        q: '¿Por qué el costo de mi receta aparece en $0?',
        a: 'Asegúrate de que los ingredientes usados tengan un precio definido en la sección de Ingredientes. El costo se calcula automáticamente con base en el precio y la cantidad de cada ingrediente.',
      },
      {
        q: '¿Puedo agregar sub-recetas dentro de una receta?',
        a: 'Sí. Primero crea la sub-receta en la sección Sub-Recetas y luego agrégala como un ingrediente más dentro de tu receta principal.',
      },
      {
        q: '¿Cómo calculo el precio de venta sugerido?',
        a: 'ChefFlow calcula el costo total de la receta. A partir de ahí puedes definir tu margen de ganancia deseado y el sistema te mostrará el precio de venta sugerido.',
      },
      {
        q: '¿Puedo agregar fotos a mis recetas?',
        a: 'Sí. Dentro de cada receta encontrarás la opción para subir una imagen del platillo. La foto también aparece al imprimir la receta.',
      },
    ],
  },
  {
    label: 'Menús',
    items: [
      {
        q: '¿Cómo agrego recetas a un menú?',
        a: 'Abre el menú desde la sección Menús y usa el botón "Agregar receta". Puedes buscar y agregar cualquier receta que hayas creado.',
      },
      {
        q: '¿Puedo imprimir un menú completo?',
        a: 'Sí. Dentro del menú encontrarás el botón "Imprimir" que genera una vista de impresión con todas las recetas y sus detalles.',
      },
      {
        q: '¿Puedo tener varios menús al mismo tiempo?',
        a: 'Sí, puedes crear tantos menús como necesites —por ejemplo, uno para desayunos, uno para comidas y otro para eventos especiales.',
      },
    ],
  },
  {
    label: 'Colaboradores',
    items: [
      {
        q: '¿Qué información puede ver un colaborador?',
        a: 'Los colaboradores solo ven las recetas y menús que explícitamente les compartes. No tienen acceso a tus costos, proveedores ni configuración de cuenta.',
      },
      {
        q: '¿Cómo invito a un colaborador?',
        a: 'Ve a la sección Colaboradores, haz clic en "Invitar colaborador" e ingresa el correo electrónico de la persona. Recibirá acceso una vez que inicie sesión con ese correo.',
      },
      {
        q: '¿Puedo revocar el acceso de un colaborador?',
        a: 'Sí. Desde la sección Colaboradores puedes eliminar a cualquier persona en cualquier momento. El acceso se revoca de inmediato.',
      },
    ],
  },
  {
    label: 'Pagos',
    items: [
      {
        q: '¿Qué incluye el plan gratuito?',
        a: 'El plan gratuito te permite explorar las funciones principales de ChefFlow con límites en la cantidad de recetas e ingredientes. Para uso ilimitado, revisa los planes disponibles en Mi Cuenta.',
      },
      {
        q: '¿Cómo cancelo mi suscripción?',
        a: 'Puedes cancelar en cualquier momento desde Mi Cuenta → Suscripción. Tu acceso al plan pagado se mantiene hasta el final del período ya cobrado.',
      },
      {
        q: '¿Emiten facturas o comprobantes de pago?',
        a: 'Sí. Los comprobantes de pago se envían automáticamente al correo registrado en tu cuenta después de cada cobro. Para facturas con datos fiscales, contáctanos por el chat de soporte.',
      },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      {
        q: '¿Cómo cambio mi correo electrónico o contraseña?',
        a: 'Ve a la sección Mi Cuenta → Configuración de cuenta. Desde ahí puedes actualizar tu correo electrónico y cambiar tu contraseña.',
      },
      {
        q: '¿Puedo usar ChefFlow en varios dispositivos?',
        a: 'Sí. ChefFlow es 100% en la nube. Puedes acceder desde cualquier computadora o teléfono con tu misma cuenta y todos tus datos estarán sincronizados.',
      },
      {
        q: '¿Cómo elimino mi cuenta?',
        a: 'Para eliminar tu cuenta y todos tus datos, contáctanos a través del chat de soporte. Procesamos la solicitud en 48 horas hábiles.',
      },
    ],
  },
]

export default function FaqSection() {
  const [activeCategory, setActiveCategory] = useState(0)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Category tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-hide">
        {FAQ.map((cat, ci) => (
          <button
            key={cat.label}
            onClick={() => { setActiveCategory(ci); setOpenIndex(null) }}
            className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
              activeCategory === ci
                ? 'border-brand-600 text-brand-700 bg-brand-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="divide-y divide-slate-100">
        {FAQ[activeCategory].items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800">{item.q}</span>
              <ChevronDown
                size={16}
                className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4">
                <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
