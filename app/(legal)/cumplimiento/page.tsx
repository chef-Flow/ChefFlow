export const metadata = {
  title: 'Cumplimiento y Seguridad · ChefFlow',
}

export default function CumplimientoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Cumplimiento y Seguridad</h1>
      <p className="text-sm text-slate-400 mb-10">Última actualización: junio 2025</p>

      <p className="text-slate-600 mb-10 text-lg">
        En ChefFlow, la seguridad de sus datos es una prioridad. Esta página describe las medidas técnicas y organizativas que implementamos para proteger su información.
      </p>

      <div className="space-y-8 text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Infraestructura y alojamiento</h2>
          <div className="space-y-3">
            <div className="flex gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-bold text-sm">DB</div>
              <div>
                <p className="font-semibold text-slate-900">Base de datos — Supabase (PostgreSQL)</p>
                <p className="text-sm text-slate-500 mt-0.5">Todos los datos se almacenan en PostgreSQL gestionado por Supabase, con encriptación en reposo (AES-256) y en tránsito (TLS 1.2+). Los servidores están alojados en AWS (región US East).</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-bold text-sm">App</div>
              <div>
                <p className="font-semibold text-slate-900">Aplicación web — Vercel</p>
                <p className="text-sm text-slate-500 mt-0.5">La aplicación se despliega en la red global de Vercel con HTTPS obligatorio, certificados TLS automáticos y protección DDoS integrada.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Seguridad de contraseñas</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Las contraseñas se encriptan usando <strong>bcrypt</strong> con un factor de costo mínimo de 10 rondas. Nunca se almacenan en texto plano.</li>
            <li>La autenticación es gestionada por Supabase Auth, que implementa protección contra ataques de fuerza bruta y rate limiting.</li>
            <li>Las sesiones se gestionan mediante tokens JWT con expiración automática.</li>
            <li>Recomendamos usar contraseñas de al menos 12 caracteres con combinación de letras, números y símbolos.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Seguridad de pagos</h2>
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-3">
            <p className="font-semibold text-green-800">Stripe · PCI DSS Nivel 1</p>
            <p className="text-sm text-green-700 mt-1">Todos los pagos son procesados por Stripe, certificado en el nivel más alto del estándar PCI DSS (Payment Card Industry Data Security Standard). ChefFlow nunca ve ni almacena números de tarjeta de crédito, CVV ni datos bancarios sensibles.</p>
          </div>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Los datos de pago viajan directamente entre el navegador del usuario y Stripe mediante comunicación encriptada.</li>
            <li>ChefFlow únicamente recibe un token de referencia seguro (token de cliente) de Stripe.</li>
            <li>Los webhooks de Stripe se verifican mediante firma criptográfica HMAC-SHA256.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Encriptación de datos</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>En tránsito:</strong> toda la comunicación entre el navegador y los servidores se realiza exclusivamente mediante HTTPS (TLS 1.2 o superior). HTTP no está permitido.</li>
            <li><strong>En reposo:</strong> los datos almacenados en la base de datos están encriptados con AES-256 por defecto en Supabase.</li>
            <li><strong>Variables de entorno:</strong> las claves secretas (API keys, tokens) se almacenan como variables de entorno encriptadas en Vercel y nunca se exponen en el código fuente.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Control de acceso a datos (RLS)</h2>
          <p>
            ChefFlow implementa <strong>Row Level Security (RLS)</strong> en la base de datos, lo que garantiza que cada usuario únicamente pueda acceder a sus propios datos. Es imposible, a nivel de base de datos, que un usuario acceda a las recetas, ingredientes o información de otro usuario.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Respaldos (backups)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Supabase realiza <strong>respaldos automáticos diarios</strong> de la base de datos.</li>
            <li>Los respaldos se conservan por un período mínimo de 7 días.</li>
            <li>En caso de pérdida de datos por fallo de la plataforma, el tiempo máximo de recuperación (RPO) es de 24 horas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Gestión de incidentes de seguridad</h2>
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="font-semibold text-slate-900 mb-1">Tiempo de respuesta</p>
              <p className="text-sm text-slate-600">Nos comprometemos a evaluar y responder a cualquier incidente de seguridad reportado en un plazo máximo de <strong>72 horas</strong>.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="font-semibold text-slate-900 mb-1">Notificación a usuarios</p>
              <p className="text-sm text-slate-600">En caso de una brecha de seguridad que afecte datos personales, notificaremos a los usuarios afectados dentro de las 72 horas siguientes a su detección, conforme a la LFPDPPP y el GDPR.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Reporte de vulnerabilidades</h2>
          <p>
            Si descubre una vulnerabilidad de seguridad en ChefFlow, le pedimos que nos lo informe de manera responsable antes de divulgarlo públicamente. Apreciamos la colaboración de la comunidad de seguridad.
          </p>
          <div className="mt-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <p className="font-semibold text-brand-900">Contacto de seguridad</p>
            <p className="text-sm text-brand-700 mt-1">
              Envíe su reporte a: <a href="mailto:chefflow9@gmail.com" className="font-semibold hover:underline">chefflow9@gmail.com</a>
            </p>
            <p className="text-sm text-brand-600 mt-1">Por favor incluya: descripción de la vulnerabilidad, pasos para reproducirla y el posible impacto.</p>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Nos comprometemos a: acusar recibo en 48 horas, investigar el reporte, notificarle la resolución y, si corresponde, reconocer públicamente su contribución.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">9. Prácticas de desarrollo seguro</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Revisión de dependencias y actualizaciones de seguridad de manera regular.</li>
            <li>Validación y sanitización de todas las entradas del usuario para prevenir inyección SQL y XSS.</li>
            <li>Variables secretas gestionadas exclusivamente mediante entornos seguros, nunca en el código fuente.</li>
            <li>Principio de mínimo privilegio en todos los accesos a la base de datos.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">10. Cumplimiento normativo</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: 'LFPDPPP', desc: 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares — México' },
              { title: 'GDPR', desc: 'Reglamento General de Protección de Datos — Unión Europea' },
              { title: 'PCI DSS Nivel 1', desc: 'Estándar de seguridad para procesamiento de pagos con tarjeta (vía Stripe)' },
              { title: 'TLS 1.2+', desc: 'Protocolo de seguridad para todas las comunicaciones en tránsito' },
            ].map(({ title, desc }) => (
              <div key={title} className="p-4 bg-slate-50 rounded-xl">
                <p className="font-bold text-brand-600 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">11. Contacto</h2>
          <div className="p-4 bg-slate-50 rounded-xl text-sm">
            <p>Correo: <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">chefflow9@gmail.com</a></p>
            <p>Sitio web: chefflow.mx</p>
          </div>
        </section>

      </div>
    </div>
  )
}
