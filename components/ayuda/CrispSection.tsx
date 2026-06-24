'use client'

import { useState } from 'react'
import { MessageCircle, ChevronDown } from 'lucide-react'

const CRISP_EMBED_URL =
  'https://go.crisp.chat/chat/embed/?website_id=efa89fec-661d-4e88-bc9a-11f248fa1e8f'

export default function CrispSection() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-6 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={20} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-800">Chat con soporte</p>
          <p className="text-sm text-slate-500 mt-0.5">
            ¿No encontraste lo que buscabas? Escríbenos y te ayudamos.
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Crisp iframe — solo se carga cuando el usuario abre el panel */}
      {open && (
        <div className="border-t border-slate-100">
          <iframe
            src={CRISP_EMBED_URL}
            className="w-full"
            style={{ height: 500, border: 'none', display: 'block' }}
            title="Chat de soporte"
          />
        </div>
      )}
    </div>
  )
}
