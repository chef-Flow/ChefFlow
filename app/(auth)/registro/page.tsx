'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import AppLogo from '@/components/ui/AppLogo'
import { signUpWithTerminos } from './actions'

export default function RegistroPage() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aceptaTerminos) return
    setError(null)
    setLoading(true)
    const result = await signUpWithTerminos(email, password)
    if (!result.ok) setError(result.error ?? 'Error al crear la cuenta.')
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <AppLogo size={64} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Cuenta creada</h2>
          <p className="text-slate-500 text-sm mb-6">
            Revisa tu correo para confirmar tu cuenta y luego inicia sesión.
          </p>
          <Link
            href="/login"
            className="block w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors text-center"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AppLogo size={72} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta gratis</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com" required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required minLength={6}
                  className="w-full px-3 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={e => setAceptaTerminos(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-600 flex-shrink-0"
                required
              />
              <span className="text-sm text-slate-600 leading-snug">
                Acepto los{' '}
                <Link href="/terminos" target="_blank" className="text-brand-600 hover:underline font-medium">
                  Términos y Condiciones
                </Link>
                {' '}y la{' '}
                <Link href="/privacidad" target="_blank" className="text-brand-600 hover:underline font-medium">
                  Política de Privacidad
                </Link>
                {' '}de ChefFlow
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !aceptaTerminos}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
