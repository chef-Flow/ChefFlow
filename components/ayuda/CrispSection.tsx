'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Loader2, Clock } from 'lucide-react'

const CRISP_WEBSITE_ID = 'efa89fec-661d-4e88-bc9a-11f248fa1e8f'

declare global {
  interface Window {
    $crisp: any[]
    CRISP_WEBSITE_ID: string
  }
}

export default function CrispSection() {
  const [clicking, setClicking] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!window.$crisp) {
      window.$crisp = []
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID
      window.$crisp.push(['do', 'chat:hide'])

      const s = document.createElement('script')
      s.src = 'https://client.crisp.chat/l.js'
      s.async = true
      document.head.appendChild(s)
    } else {
      window.$crisp.push(['do', 'chat:hide'])
    }

    return () => {
      try { window.$crisp?.push(['do', 'chat:hide']) } catch { /* ignore */ }
    }
  }, [])

  const openChat = () => {
    if (!window.$crisp) return
    setClicking(true)
    window.$crisp.push(['do', 'chat:show'])
    window.$crisp.push(['do', 'chat:open'])
    window.$crisp.push(['on', 'chat:closed', () => {
      window.$crisp.push(['do', 'chat:hide'])
      setClicking(false)
    }])
    setTimeout(() => setClicking(false), 1500)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={20} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-800">Chat con soporte</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            ¿No encontraste lo que buscabas? Escríbenos y te ayudamos.
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <Clock size={12} className="text-slate-400" />
            <span className="text-xs text-slate-400">Tiempo de respuesta: menos de 24 horas</span>
          </div>
        </div>
      </div>

      <button
        onClick={openChat}
        className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        {clicking ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Abriendo chat…
          </>
        ) : (
          <>
            <MessageCircle size={15} />
            Abrir chat de soporte
          </>
        )}
      </button>
    </div>
  )
}
