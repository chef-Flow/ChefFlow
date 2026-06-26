export const metadata = {
  title: 'Política de Cancelación · ChefFlow',
}

export default function CancelacionPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Política de Cancelación</h1>
      <p className="text-sm text-slate-400 mb-10">Última actualización: junio 2025</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Libertad de cancelación</h2>
          <p>
            En ChefFlow puedes cancelar tu suscripción en cualquier momento, sin penalización ni permanencia
            mínima. No necesitas llamar ni enviar correo — todo se gestiona directamente desde la app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Cómo cancelar</h2>
          <ol className="list-decimal pl-6 mt-2 space-y-2">
            <li>Inicia sesión en <strong>chefflow.mx</strong>.</li>
            <li>Ve a <strong>Configuración</strong> en el menú lateral.</li>
            <li>Busca la sección <strong>Suscripción</strong>.</li>
            <li>Haz clic en <strong>&ldquo;Cancelar suscripción&rdquo;</strong> y confirma la acción.</li>
          </ol>
          <p className="mt-3">
            Si tienes problemas para cancelar desde la app, escríbenos a{' '}
            <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">
              chefflow9@gmail.com
            </a>{' '}
            y procesamos la cancelación en un plazo máximo de 24 horas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Qué pasa después de cancelar</h2>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>
              <strong>Acceso hasta fin de periodo:</strong> sigues teniendo acceso completo a tu plan actual
              hasta la fecha en que termina el ciclo de facturación ya pagado. No pierdes nada de inmediato.
            </li>
            <li>
              <strong>Sin renovación automática:</strong> no se realiza ningún cobro adicional tras la cancelación.
            </li>
            <li>
              <strong>Degradación a plan gratuito:</strong> al vencer el periodo pagado, tu cuenta pasa
              automáticamente al plan gratuito. Tus recetas, ingredientes y datos permanecen guardados;
              solo se desactivan las funciones exclusivas del plan de pago.
            </li>
            <li>
              <strong>Tus datos se conservan:</strong> no eliminamos tu información inmediatamente. Puedes
              reactivar tu suscripción en cualquier momento y recuperar el acceso completo sin perder nada.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Reactivación</h2>
          <p>
            Si cancelas y después decides volver a suscribirte, puedes hacerlo desde{' '}
            <strong>Configuración → Suscripción</strong> en cualquier momento. Si reactivas antes de que
            venza el periodo pagado actual, la cancelación se revierte y tu suscripción continúa sin
            interrupciones.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Eliminación de cuenta</h2>
          <p>
            La cancelación de suscripción <strong>no elimina tu cuenta</strong>. Si deseas eliminar
            completamente tu cuenta y todos tus datos, envía una solicitud explícita a{' '}
            <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">
              chefflow9@gmail.com
            </a>
            . Procesamos la eliminación en un máximo de 30 días naturales conforme a nuestra{' '}
            <a href="/privacidad" className="text-brand-600 hover:underline">Política de Privacidad</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Contacto</h2>
          <p>Si tienes dudas sobre tu cancelación o suscripción:</p>
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
