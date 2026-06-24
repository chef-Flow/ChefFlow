import { HelpCircle } from 'lucide-react'
import FaqSection from '@/components/ayuda/FaqSection'
import CrispSection from '@/components/ayuda/CrispSection'

export const metadata = { title: 'Ayuda — ChefFlow' }

export default function AyudaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <HelpCircle size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Centro de ayuda</h1>
          <p className="text-sm text-slate-500">Encuentra respuestas o contáctanos directamente.</p>
        </div>
      </div>

      {/* FAQ */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Preguntas frecuentes
        </h2>
        <FaqSection />
      </section>

      {/* Chat */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Soporte directo
        </h2>
        <CrispSection />
      </section>
    </div>
  )
}
