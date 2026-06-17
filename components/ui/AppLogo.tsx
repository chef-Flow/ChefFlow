'use client'

import { useState } from 'react'
import { ChefHat } from 'lucide-react'

interface Props {
  size?: number
  withText?: boolean
  className?: string
}

export default function AppLogo({ size = 32, withText = false, className = '' }: Props) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex-shrink-0 rounded-lg overflow-hidden"
        style={{ width: size, height: size }}
      >
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo.avif"
            alt="ChefFlow"
            width={size}
            height={size}
            className="object-cover w-full h-full"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Fallback: ícono naranja mientras no existe logo.png */
          <div
            className="w-full h-full bg-brand-600 flex items-center justify-center shadow-sm"
            style={{ borderRadius: 8 }}
          >
            <ChefHat size={Math.round(size * 0.55)} className="text-white" />
          </div>
        )}
      </div>

      {withText && (
        <div className="leading-tight">
          <div className="text-sm font-bold text-slate-900">ChefFlow</div>
          <div className="text-xs text-slate-400">Costeo de recetas</div>
        </div>
      )}
    </div>
  )
}
