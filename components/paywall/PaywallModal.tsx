'use client'

import { Lock, Zap, Crown, Check, CreditCard } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { FREE_PLAN_LIMIT } from '@/types'
import { crearCheckoutSession } from '@/app/(dashboard)/cuenta/stripe-actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  requiredPlan: 'basic' | 'pro'
  message?: string
  tipo?: 'receta' | 'sub-receta'
}

function PlanCard({
  planKey,
  nombre,
  precio,
  beneficios,
  icon: Icon,
  highlighted,
}: {
  planKey: 'basic' | 'pro'
  nombre: string
  precio: string
  beneficios: string[]
  icon: React.ElementType
  highlighted?: boolean
}) {
  if (highlighted) {
    return (
      <div className="bg-brand-600 rounded-2xl p-5 flex-1 relative overflow-hidden">
        <div className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Popular
        </div>
        <div className="flex items-center gap-2 mb-0.5">
          <Icon size={16} className="text-white/80" />
          <span className="text-sm font-bold tracking-wide uppercase text-white">{nombre}</span>
        </div>
        <div className="mt-2 mb-4">
          <span className="text-3xl font-black text-white">{precio}</span>
          <span className="text-white/60 text-sm ml-1">MXN / mes</span>
        </div>
        <ul className="space-y-1.5 mb-5">
          {beneficios.map((b) => (
            <li key={b} className="flex items-center gap-2 text-xs text-white/90">
              <Check size={12} className="text-white flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>
        <form action={crearCheckoutSession}>
          <input type="hidden" name="plan" value={planKey} />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-brand-600 rounded-xl text-sm font-semibold hover:bg-brand-50 transition-colors shadow-sm"
          >
            <CreditCard size={14} />
            Suscribirme por {precio}/mes
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 flex-1 border-2 border-brand-600">
      <div className="flex items-center gap-2 mb-0.5">
        <Icon size={16} className="text-brand-600" />
        <span className="text-sm font-bold tracking-wide uppercase text-brand-600">{nombre}</span>
      </div>
      <div className="mt-2 mb-4">
        <span className="text-3xl font-black text-brand-600">{precio}</span>
        <span className="text-slate-400 text-sm ml-1">MXN / mes</span>
      </div>
      <ul className="space-y-1.5 mb-5">
        {beneficios.map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-slate-600">
            <Check size={12} className="text-brand-500 flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>
      <form action={crearCheckoutSession}>
        <input type="hidden" name="plan" value={planKey} />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <CreditCard size={14} />
          Suscribirme por {precio}/mes
        </button>
      </form>
    </div>
  )
}

export default function PaywallModal({ isOpen, onClose, requiredPlan, message, tipo }: Props) {
  const label = tipo === 'receta' ? 'recetas' : tipo === 'sub-receta' ? 'sub-recetas' : null

  const defaultMessage = label
    ? `Has llegado al límite de ${FREE_PLAN_LIMIT} ${label} gratis. Elige un plan para crear sin límites.`
    : requiredPlan === 'pro'
      ? 'Esta función requiere el Plan Pro.'
      : 'Esta función requiere el Plan Básico.'

  const showBothPlans = requiredPlan === 'basic'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Elige tu plan" size={showBothPlans ? 'md' : 'sm'}>
      <div className="space-y-4">
        {/* Aviso */}
        <div className="flex items-start gap-3 p-3.5 bg-brand-50 border border-brand-200 rounded-xl">
          <Lock size={17} className="text-brand-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-snug">{message ?? defaultMessage}</p>
        </div>

        {/* Plan cards */}
        <div className={`flex gap-3 ${showBothPlans ? 'flex-col sm:flex-row' : ''}`}>
          {showBothPlans && (
            <PlanCard
              planKey="basic"
              nombre="Básico"
              precio="$299"
              icon={Zap}
              beneficios={[
                'Recetas y sub-recetas ilimitadas',
                'Menús ilimitados',
                'Foto del platillo',
                'PDF con privacidad',
                '1 colaborador solo lectura',
              ]}
            />
          )}
          <PlanCard
            planKey="pro"
            nombre="Pro"
            precio="$499"
            icon={Crown}
            highlighted
            beneficios={
              showBothPlans
                ? [
                    'Todo lo del Básico',
                    'Colaboradores con edición',
                    'Análisis comparativo de menús',
                    'Ajuste masivo de precios',
                    'Exportar a Excel',
                  ]
                : [
                    'Colaboradores ilimitados con edición',
                    'Ajuste de precios masivo por menú',
                    'Análisis comparativo entre menús',
                    'Alertas de precios de ingredientes',
                    'Exportar a Excel',
                  ]
            }
          />
        </div>

        <p className="text-center text-xs text-slate-400 pb-1">
          Pago seguro con Stripe · Cancela cuando quieras
        </p>
      </div>
    </Modal>
  )
}
