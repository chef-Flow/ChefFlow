import Link from 'next/link'
import AppLogo from '@/components/ui/AppLogo'
import { CheckCircle2, TrendingUp, Brain, DollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppLogo size={34} />
            <span className="font-extrabold text-brand-600 text-lg tracking-tight">ChefFlow</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors px-3 py-2"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
            >
              Empieza gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 sm:px-6 bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 rounded-3xl p-5">
              <AppLogo size={72} />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Sabe exactamente cuánto<br className="hidden sm:block" /> te cuesta cada platillo
          </h1>
          <p className="text-lg sm:text-xl text-brand-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            ChefFlow calcula el costo real de tus recetas, tu margen de ganancia y te ayuda a fijar precios con confianza. Sin hojas de cálculo, sin adivinanzas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registro"
              className="px-8 py-4 bg-white text-brand-600 font-bold text-base rounded-xl hover:bg-brand-50 transition-colors shadow-xl"
            >
              Empieza gratis →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border-2 border-white/40 text-white font-semibold text-base rounded-xl hover:border-white hover:bg-white/10 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
          <p className="text-brand-200 text-sm mt-6">Sin tarjeta de crédito · Gratis para siempre en el plan básico</p>
        </div>
      </section>

      {/* Problems / Benefits */}
      <section className="py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              ¿Cuánto te cuesta realmente tu menú?
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              La mayoría de los restaurantes fijan precios por intuición. ChefFlow te da los números exactos para tomar decisiones que sí funcionan.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <DollarSign className="text-brand-500" size={28} />,
                title: 'Costo real por platillo',
                desc: 'Registra ingredientes, mermas y costos de sub-recetas. ChefFlow calcula automáticamente cuánto te cuesta cada porción, al centavo.',
              },
              {
                icon: <TrendingUp className="text-brand-500" size={28} />,
                title: 'Margen de ganancia real',
                desc: 'Conoce tu margen real incluyendo IVA, comisiones bancarias y plataformas de delivery como Uber Eats o DiDi Food.',
              },
              {
                icon: <Brain className="text-brand-500" size={28} />,
                title: 'Decisiones con datos',
                desc: 'Deja de adivinar. Fija el precio correcto, identifica platillos no rentables y construye un negocio sólido con datos reales.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Planes para cada etapa
            </h2>
            <p className="text-slate-500 text-lg">
              Empieza gratis. Crece cuando lo necesites.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">

            {/* Free */}
            <div className="rounded-2xl border border-slate-200 p-8">
              <div className="mb-7">
                <h3 className="text-base font-bold text-slate-500 uppercase tracking-wide mb-3">Gratuito</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$0</span>
                </div>
                <div className="text-sm text-slate-400 mt-1">Para siempre</div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Ingredientes ilimitados',
                  '3 recetas máximo',
                  '3 sub-recetas máximo',
                  'Análisis de margen completo',
                  'Margen de seguridad por receta',
                  'PDF de tus 3 recetas',
                  'Proveedores y comisión bancaria',
                  'Plataformas de delivery',
                  'IVA configurable',
                  '1 colaborador solo lectura',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={15} className="text-brand-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/registro"
                className="block w-full text-center py-3 border-2 border-brand-600 text-brand-600 font-semibold rounded-xl hover:bg-brand-50 transition-colors text-sm"
              >
                Crear cuenta gratis
              </Link>
            </div>

            {/* Basic — highlighted */}
            <div className="rounded-2xl border-2 border-brand-600 p-8 relative shadow-lg">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide">
                MÁS POPULAR
              </div>
              <div className="mb-7">
                <h3 className="text-base font-bold text-brand-600 uppercase tracking-wide mb-3">Básico</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$299</span>
                </div>
                <div className="text-sm text-slate-400 mt-1">MXN / mes</div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Todo lo del plan Gratuito',
                  'Recetas y sub-recetas ilimitadas',
                  'Editar y eliminar todo',
                  'Menús ilimitados',
                  'Foto del platillo',
                  'PDF completo con opciones',
                  'Exportar ingredientes por categoría',
                  'Alertas de precios y fechas',
                  'Margen mínimo por menú',
                  'Unidades y presentaciones personalizadas',
                  '1 colaborador solo lectura',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={15} className="text-brand-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/registro"
                className="block w-full text-center py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors text-sm shadow-sm"
              >
                Empezar
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-slate-200 p-8 bg-slate-50">
              <div className="mb-7">
                <h3 className="text-base font-bold text-slate-500 uppercase tracking-wide mb-3">Pro</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$499</span>
                </div>
                <div className="text-sm text-slate-400 mt-1">MXN / mes</div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Todo lo del plan Básico',
                  'Colaboradores ilimitados',
                  'Permisos de edición por colaborador',
                  'Ajuste de precios masivo por menú',
                  'Análisis comparativo entre menús',
                  'Alertas de subida de precios',
                  'Exportar a Excel',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={15} className="text-brand-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/registro"
                className="block w-full text-center py-3 border-2 border-brand-600 text-brand-600 font-semibold rounded-xl hover:bg-brand-50 transition-colors text-sm"
              >
                Empezar
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 bg-brand-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Tu restaurante merece números claros
          </h2>
          <p className="text-brand-100 mb-10 text-lg leading-relaxed">
            Únete a los chefs y restauranteros que ya conocen el costo real de su menú y toman decisiones con confianza.
          </p>
          <Link
            href="/registro"
            className="inline-block px-10 py-4 bg-white text-brand-600 font-bold text-base rounded-xl hover:bg-brand-50 transition-colors shadow-xl"
          >
            Crear cuenta gratis →
          </Link>
          <p className="text-brand-200 text-sm mt-5">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 bg-brand-700 text-brand-300 text-center text-sm">
        <div className="flex justify-center items-center gap-2 mb-4">
          <AppLogo size={18} />
          <span className="font-bold text-white">ChefFlow</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4 text-brand-400">
          <Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
          <Link href="/registro" className="hover:text-white transition-colors">Registrarse</Link>
          <Link href="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
          <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
          <Link href="/cumplimiento" className="hover:text-white transition-colors">Cumplimiento</Link>
        </div>
        <p>© 2025 ChefFlow · Todos los derechos reservados · Guadalajara, México</p>
      </footer>

    </div>
  )
}
