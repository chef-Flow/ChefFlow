'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLogo from '@/components/ui/AppLogo'

function ResetPasswordForm() {
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [verifying, setVerifying]       = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type      = searchParams.get('type')

    if (!tokenHash || type !== 'recovery') {
      setVerifying(false)
      setError('Enlace inválido. Solicita un nuevo correo de recuperación.')
      return
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      .then(({ error }) => {
        if (error) setError('El enlace expiró o ya fue usado. Solicita uno nuevo.')
        setVerifying(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError('No se pudo actualizar la contraseña. Intenta de nuevo.')
    else setSuccess(true)
    setLoading(false)
  }

  if (verifying) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-4"><AppLogo size={64} /></div>
        <p className="text-slate-500 text-sm">Verificando enlace...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4"><AppLogo size={64} /></div>
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Contraseña actualizada</h2>
        <p className="text-slate-500 text-sm mb-6">Tu contraseña ha sido restablecida exitosamente.</p>
        <button
          onClick={() => router.push('/analisis')}
          className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Ir a la app
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4"><AppLogo size={72} /></div>
        <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
        <p className="text-slate-500 text-sm mt-2">Elige una contraseña segura para tu cuenta.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
          {error.includes('expiró') && (
            <div className="mt-2">
              <a href="/forgot-password" className="text-brand-600 font-medium hover:underline">
                Solicitar nuevo enlace
              </a>
            </div>
          )}
        </div>
      )}

      {!error && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" required minLength={8}
                className="w-full px-3 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña" required minLength={8}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-2">
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 h-64 animate-pulse" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
