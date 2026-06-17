'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Lock, Crown, LogOut, Check, Loader2,
  Eye, EyeOff, Sparkles, X, Zap, AlertTriangle, CalendarClock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { actualizarNombre, actualizarEmail, actualizarContrasena } from '@/app/(dashboard)/cuenta/actions'
import { cancelarSuscripcion } from '@/app/(dashboard)/cuenta/stripe-actions'
import PaywallModal from '@/components/paywall/PaywallModal'
import type { Plan } from '@/types'

interface Props {
  email: string
  nombre: string
  plan: Plan
  cancelled: boolean
  subscriptionEndDate: string | null
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <Icon size={16} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4">
      <label className="text-sm text-slate-500 sm:w-32 sm:pt-2 flex-shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function StatusMsg({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p className={`text-xs mt-1.5 flex items-center gap-1 ${ok ? 'text-green-600' : 'text-red-500'}`}>
      {ok && <Check size={11} />}
      {msg}
    </p>
  )
}


export default function MiCuenta({ email, nombre, plan, cancelled, subscriptionEndDate }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelPending, startCancel] = useTransition()
  const [cancelMsg, setCancelMsg] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleCancelar = () => {
    setCancelMsg(null)
    startCancel(async () => {
      const res = await cancelarSuscripcion()
      if (res.ok) {
        setShowCancelConfirm(false)
        router.refresh()
      } else {
        setCancelMsg({ ok: false, msg: res.error ?? 'Error al cancelar.' })
      }
    })
  }

  const fmtEndDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  const [nombreVal, setNombreVal] = useState(nombre)
  const [nombreMsg, setNombreMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [nombrePending, startNombre] = useTransition()

  const guardarNombre = () => {
    setNombreMsg(null)
    startNombre(async () => {
      const res = await actualizarNombre(nombreVal)
      setNombreMsg(
        res.ok
          ? { ok: true, msg: 'Nombre actualizado.' }
          : { ok: false, msg: res.error ?? 'Error al guardar.' }
      )
    })
  }

  const [emailVal, setEmailVal] = useState(email)
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [emailPending, startEmail] = useTransition()

  const guardarEmail = () => {
    setEmailMsg(null)
    startEmail(async () => {
      const res = await actualizarEmail(emailVal)
      setEmailMsg(
        res.ok
          ? { ok: true, msg: 'Revisa tu nuevo correo para confirmar el cambio.' }
          : { ok: false, msg: res.error ?? 'Error al actualizar.' }
      )
    })
  }

  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [passPending, startPass] = useTransition()

  const guardarPass = () => {
    setPassMsg(null)
    if (pass1 !== pass2) {
      setPassMsg({ ok: false, msg: 'Las contrasenas no coinciden.' })
      return
    }
    startPass(async () => {
      const res = await actualizarContrasena(pass1)
      if (res.ok) {
        setPass1('')
        setPass2('')
        setPassMsg({ ok: true, msg: 'Contrasena actualizada.' })
      } else {
        setPassMsg({ ok: false, msg: res.error ?? 'Error al actualizar.' })
      }
    })
  }

  const [showUpgrade, setShowUpgrade] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (nombreVal || email).slice(0, 2).toUpperCase()

  const planBadge = {
    free:  { label: 'Plan Gratuito',  cls: 'bg-slate-100 text-slate-600' },
    basic: { label: 'Plan Básico',    cls: 'bg-blue-100 text-blue-700' },
    pro:   { label: 'Plan Pro',       cls: 'bg-gradient-to-r from-brand-500 to-amber-500 text-white' },
  }[plan]

  return (
    <div className="relative">
      <PaywallModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        requiredPlan={plan === 'basic' ? 'pro' : 'basic'}
      />

      {/* Modal confirmación de cancelación */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">¿Cancelar suscripción?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="ml-auto p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-slate-600">
                Seguirás teniendo acceso a todas las funciones de tu plan hasta que termine el período actual.
                Al vencer, tu cuenta pasará automáticamente al <strong>plan gratuito</strong>.
              </p>
              {cancelMsg && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{cancelMsg.msg}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Mantener plan
                </button>
                <button
                  onClick={handleCancelar}
                  disabled={cancelPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {cancelPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  {cancelPending ? 'Cancelando...' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-brand-500">{initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mi Cuenta</h1>
            <p className="text-sm text-slate-400">{email}</p>
          </div>
        </div>

        <SectionCard title="Plan actual" icon={Crown}>
          <div className="space-y-3">
            {/* Badge + descripción */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit ${planBadge.cls}`}>
                {plan === 'pro' && <Crown size={14} />}
                {plan === 'basic' && <Zap size={14} />}
                <span className="text-sm font-semibold">{planBadge.label}</span>
              </div>
              {plan === 'free' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Funciones limitadas.</span>
                  <button
                    onClick={() => setShowUpgrade(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    <Sparkles size={13} /> Ver planes
                  </button>
                </div>
              ) : cancelled && subscriptionEndDate ? (
                <span className="text-sm text-slate-500">
                  Acceso activo hasta el <strong>{fmtEndDate(subscriptionEndDate)}</strong>.
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {plan === 'basic' ? 'Colaboradores limitados y sin exportación Excel.' : 'Acceso completo a todas las funciones.'}
                  </span>
                  {plan === 'basic' && (
                    <button
                      onClick={() => setShowUpgrade(true)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      <Sparkles size={13} /> Mejorar a Pro
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Banner suscripción cancelada */}
            {cancelled && subscriptionEndDate && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <CalendarClock size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Tu suscripción está activa hasta el <strong>{fmtEndDate(subscriptionEndDate)}</strong>.
                  Después pasarás al plan gratuito automáticamente.
                </span>
              </div>
            )}

            {/* Botón cancelar (solo si plan pagado y no cancelado) */}
            {plan !== 'free' && !cancelled && (
              <div className="pt-1">
                <button
                  onClick={() => { setCancelMsg(null); setShowCancelConfirm(true) }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2"
                >
                  Cancelar suscripción
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Informacion personal" icon={User}>
          <div className="space-y-4">
            <FieldRow label="Nombre">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nombreVal}
                  onChange={e => setNombreVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarNombre()}
                  placeholder="Tu nombre"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={guardarNombre}
                  disabled={nombrePending || nombreVal === nombre}
                  className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  {nombrePending ? <Loader2 size={13} className="animate-spin" /> : 'Guardar'}
                </button>
              </div>
              {nombreMsg && <StatusMsg {...nombreMsg} />}
            </FieldRow>

            <div className="border-t border-slate-100" />

            <FieldRow label="Correo">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailVal}
                  onChange={e => setEmailVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarEmail()}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={guardarEmail}
                  disabled={emailPending || emailVal === email || !emailVal.includes('@')}
                  className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  {emailPending ? <Loader2 size={13} className="animate-spin" /> : 'Cambiar'}
                </button>
              </div>
              {emailMsg && <StatusMsg {...emailMsg} />}
              {!emailMsg && (
                <p className="text-xs text-slate-400 mt-1">
                  Se enviara un correo de confirmacion a la nueva direccion.
                </p>
              )}
            </FieldRow>
          </div>
        </SectionCard>

        <SectionCard title="Contrasena" icon={Lock}>
          <div className="space-y-3">
            <FieldRow label="Nueva contrasena">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass1}
                  onChange={e => setPass1(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </FieldRow>

            <FieldRow label="Confirmar">
              <input
                type={showPass ? 'text' : 'password'}
                value={pass2}
                onChange={e => setPass2(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pass1 && guardarPass()}
                placeholder="Repite la contrasena"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </FieldRow>

            <div className="flex justify-end">
              <button
                onClick={guardarPass}
                disabled={passPending || !pass1 || !pass2}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {passPending ? <Loader2 size={13} className="animate-spin" /> : 'Actualizar contrasena'}
              </button>
            </div>
            {passMsg && <StatusMsg {...passMsg} />}
          </div>
        </SectionCard>

        <SectionCard title="Sesion" icon={LogOut}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Cerrar sesion en este dispositivo.</p>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
              Cerrar sesion
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
