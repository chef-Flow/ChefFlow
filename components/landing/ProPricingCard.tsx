'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

const FEATURES = [
  'Todo lo del plan Básico',
  'PDF completo con opciones',
  'Colaboradores ilimitados',
  'Permisos de edición por colaborador',
  'Ajuste de precios masivo por menú',
  'Análisis comparativo entre menús',
  'Alertas de subida de precios',
  'Exportar a Excel',
]

export default function ProPricingCard() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const href = billing === 'annual' ? '/registro?plan=pro&billing=annual' : '/registro?plan=pro'

  return (
    <div className="rounded-2xl border border-slate-200 p-8 bg-slate-50">
      <div className="mb-5">
        <h3 className="text-base font-bold text-slate-500 uppercase tracking-wide mb-3">Pro</h3>

        {/* Selector Mensual / Anual */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 mb-4">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              billing === 'monthly' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setBilling('annual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              billing === 'annual' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Anual
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              billing === 'annual' ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600'
            }`}>
              -17%
            </span>
          </button>
        </div>

        {billing === 'monthly' ? (
          <>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-extrabold text-slate-900">$699</span>
            </div>
            <div className="text-sm text-slate-400 mt-1">MXN / mes</div>
          </>
        ) : (
          <>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-extrabold text-slate-900">$583</span>
            </div>
            <div className="text-sm text-slate-400 mt-1">MXN / mes, facturado anual</div>
            <div className="text-xs text-brand-600 font-medium mt-1">$7,000 MXN/año</div>
          </>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
            <CheckCircle2 size={15} className="text-brand-500 mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="block w-full text-center py-3 border-2 border-brand-600 text-brand-600 font-semibold rounded-xl hover:bg-brand-50 transition-colors text-sm"
      >
        {billing === 'annual' ? 'Empezar anual →' : 'Empezar'}
      </Link>
    </div>
  )
}
