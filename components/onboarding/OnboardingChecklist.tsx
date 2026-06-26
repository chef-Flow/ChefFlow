'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, ChefHat, PartyPopper } from 'lucide-react'
import Link from 'next/link'
import { markOnboardingComplete } from '@/app/(dashboard)/onboarding/actions'

interface Pasos {
  ingrediente: boolean
  receta: boolean
  menuReceta: boolean
}

const STEPS = [
  { key: 'ingrediente' as const, label: 'Crea tu primer ingrediente', href: '/ingredientes' },
  { key: 'receta'      as const, label: 'Crea tu primera receta',     href: '/recetas' },
  { key: 'menuReceta'  as const, label: 'Agrégala a un menú',         href: '/menus' },
]

export default function OnboardingChecklist({ pasos }: { pasos: Pasos }) {
  const total   = STEPS.filter(s => pasos[s.key]).length
  const allDone = total === 3

  const [hidden,      setHidden]      = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const markedRef = useRef(false)

  useEffect(() => {
    if (allDone && !markedRef.current) {
      markedRef.current = true
      setCelebrating(true)
      markOnboardingComplete()
      setTimeout(() => setHidden(true), 3000)
    }
  }, [allDone])

  if (hidden) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      style={{ animation: 'onboarding-slide-in 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <style>{`
        @keyframes onboarding-slide-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-amber-400 px-4 py-3 flex items-center gap-2">
        <ChefHat size={16} className="text-white flex-shrink-0" />
        <span className="text-sm font-bold text-white tracking-wide">
          {celebrating ? '¡Todo listo!' : 'Empieza en 3 pasos'}
        </span>
      </div>

      <div className="px-4 py-4">
        {celebrating ? (
          /* ── Estado de celebración ── */
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <PartyPopper size={30} className="text-amber-500" />
            <p className="text-sm font-semibold text-slate-700">¡ChefFlow está listo para ti!</p>
            <p className="text-xs text-slate-400">Este panel no volverá a aparecer.</p>
          </div>
        ) : (
          <>
            {/* ── Lista de pasos ── */}
            <div className="space-y-3">
              {STEPS.map(step => {
                const done = pasos[step.key]
                return (
                  <Link
                    key={step.key}
                    href={done ? '#' : step.href}
                    onClick={e => done && e.preventDefault()}
                    className={`flex items-center gap-3 group transition-opacity ${done ? 'cursor-default' : 'hover:opacity-75'}`}
                  >
                    {done ? (
                      <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle size={18} className="text-slate-300 flex-shrink-0 group-hover:text-brand-400 transition-colors" />
                    )}
                    <span className={`text-sm leading-tight ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {step.label}
                    </span>
                  </Link>
                )
              })}
            </div>

            {/* ── Barra de progreso ── */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Progreso</span>
                <span className="font-medium">{total}/3</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${(total / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* ── Omitir ── */}
            <button
              onClick={() => {
                markOnboardingComplete()
                setHidden(true)
              }}
              className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Omitir tutorial
            </button>
          </>
        )}
      </div>
    </div>
  )
}
