export const metadata = {
  title: 'Política de Reembolsos · ChefFlow',
}

export default function ReembolsosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Política de Reembolsos</h1>
      <p className="text-sm text-slate-400 mb-10">Última actualización: junio 2025</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Política general</h2>
          <p>
            Todos los pagos realizados en ChefFlow son <strong>finales y no reembolsables</strong>. Al suscribirte
            a un plan de pago, aceptas que no se realizarán devoluciones parciales ni totales del monto cobrado,
            salvo las excepciones indicadas en esta política.
          </p>
          <p className="mt-3">
            Esta política aplica a todos los planes de suscripción (Plan Básico y Plan Pro) ofrecidos en{' '}
            <strong>chefflow.mx</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Cancelación y acceso continuo</h2>
          <p>
            Puedes cancelar tu suscripción en cualquier momento desde{' '}
            <strong>Configuración → Suscripción → Cancelar suscripción</strong> dentro de la app. Al cancelar:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Tu suscripción <strong>no se renueva</strong> al terminar el ciclo de facturación vigente.</li>
            <li>
              Mantienes <strong>acceso completo</strong> a todas las funciones de tu plan hasta la fecha de fin
              del periodo ya pagado.
            </li>
            <li>No se te cobra ningún monto adicional tras la cancelación.</li>
            <li>Al vencer el periodo pagado, tu cuenta pasa automáticamente al plan gratuito.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Casos en los que sí procede un reembolso</h2>
          <p>ChefFlow evaluará solicitudes de reembolso en los siguientes supuestos:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Cobro duplicado:</strong> si fuiste cargado más de una vez en el mismo ciclo por error técnico.</li>
            <li><strong>Cargo no autorizado:</strong> si puedes demostrar que el cargo se realizó sin tu consentimiento.</li>
            <li>
              <strong>Falla prolongada del servicio:</strong> si ChefFlow estuvo inaccesible más de 72 horas
              continuas dentro de un ciclo de facturación pagado, sin ser atribuible a mantenimiento programado.
            </li>
          </ul>
          <p className="mt-3">
            Para solicitar un reembolso, escríbenos a{' '}
            <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">
              chefflow9@gmail.com
            </a>{' '}
            dentro de los <strong>7 días naturales</strong> posteriores al cobro, incluyendo el correo de tu cuenta
            y el comprobante del cargo. Respondemos en máximo 5 días hábiles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Cambios de plan</h2>
          <p>
            Si cambias a un plan inferior (downgrade), el cambio aplica al inicio del siguiente ciclo de
            facturación y no genera reembolso proporcional por el tiempo restante del plan actual.
          </p>
          <p className="mt-2">
            Si cambias a un plan superior (upgrade), el cobro proporcional aplica de inmediato y tienes acceso
            a las nuevas funciones al instante.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Procesamiento de pagos</h2>
          <p>
            Los pagos son procesados por <strong>Stripe Inc.</strong> bajo el estándar PCI DSS Nivel 1.
            ChefFlow no almacena datos de tarjeta. Los reembolsos aprobados se acreditan al mismo método de
            pago original en un plazo de 5 a 10 días hábiles, dependiendo del banco emisor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Contacto</h2>
          <p>Para cualquier duda sobre esta política o tu suscripción:</p>
          <div className="mt-2 p-4 bg-slate-50 rounded-xl text-sm">
            <p><strong>ChefFlow</strong></p>
            <p>Correo: <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">chefflow9@gmail.com</a></p>
            <p>Sitio web: chefflow.mx</p>
          </div>
        </section>

      </div>
    </div>
  )
}
