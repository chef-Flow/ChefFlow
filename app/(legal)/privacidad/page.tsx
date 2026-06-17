export const metadata = {
  title: 'Política de Privacidad · ChefFlow',
}

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Política de Privacidad</h1>
      <p className="text-sm text-slate-400 mb-10">Última actualización: junio 2025</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Responsable del tratamiento</h2>
          <p>
            ChefFlow (en adelante "ChefFlow", "nosotros" o "la empresa") es responsable del tratamiento de los datos personales que usted nos proporciona a través de la plataforma <strong>chefflow.mx</strong>. Para cualquier consulta relacionada con privacidad, puede contactarnos en <a href="mailto:privacidad@chefflow.mx" className="text-brand-600 hover:underline">privacidad@chefflow.mx</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Datos que recopilamos</h2>
          <p>Recopilamos únicamente los datos necesarios para prestar el servicio:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Datos de cuenta:</strong> correo electrónico y contraseña (encriptada).</li>
            <li><strong>Datos de uso:</strong> recetas, ingredientes, precios, sub-recetas, menús, proveedores y notas que usted ingresa en la plataforma.</li>
            <li><strong>Datos de pago:</strong> procesados directamente por Stripe. ChefFlow no almacena números de tarjeta ni datos bancarios en sus propios servidores.</li>
            <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo y páginas visitadas, con fines de seguridad y mejora del servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Finalidad y base legal del tratamiento</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 border border-slate-200 font-semibold">Finalidad</th>
                  <th className="text-left p-3 border border-slate-200 font-semibold">Base legal</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Prestar el servicio de costeo de recetas', 'Ejecución del contrato (Art. 6.1.b GDPR / Art. 8 LFPDPPP)'],
                  ['Procesar pagos y gestionar suscripciones', 'Ejecución del contrato'],
                  ['Enviar correos transaccionales (confirmación, facturas)', 'Ejecución del contrato'],
                  ['Mejorar la plataforma y prevenir fraudes', 'Interés legítimo'],
                  ['Cumplir obligaciones legales', 'Cumplimiento de obligación legal'],
                ].map(([fin, base], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 border border-slate-200">{fin}</td>
                    <td className="p-3 border border-slate-200 text-slate-500">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Marco legal aplicable</h2>
          <p>El tratamiento de datos personales se realiza conforme a:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>México:</strong> Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.</li>
            <li><strong>Unión Europea / España:</strong> Reglamento General de Protección de Datos (GDPR, Reglamento UE 2016/679).</li>
            <li><strong>Latinoamérica:</strong> Legislaciones nacionales equivalentes de Argentina (Ley 25.326), Colombia (Ley 1581/2012), Chile (Ley 19.628), y demás países hispanohablantes con legislación de protección de datos vigente.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Proveedores de servicio (encargados del tratamiento)</h2>
          <p>
            ChefFlow no vende ni comparte sus datos personales con terceros con fines comerciales. Únicamente compartimos datos con los siguientes proveedores de servicio que actúan como encargados del tratamiento, bajo contratos de confidencialidad y protección de datos:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Supabase Inc.</strong> — almacenamiento de base de datos (PostgreSQL encriptado), alojado en servidores AWS en Estados Unidos.</li>
            <li><strong>Stripe Inc.</strong> — procesamiento seguro de pagos. Cumple con PCI DSS Nivel 1.</li>
            <li><strong>Resend Inc.</strong> — envío de correos electrónicos transaccionales.</li>
            <li><strong>Vercel Inc.</strong> — alojamiento de la aplicación web.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Transferencias internacionales de datos</h2>
          <p>
            Los datos personales se almacenan en servidores ubicados en Estados Unidos de América. Estas transferencias se realizan bajo las garantías adecuadas establecidas por el GDPR (cláusulas contractuales tipo) y conforme a los artículos 36 y 37 de la LFPDPPP. Al utilizar ChefFlow, usted acepta expresamente dicha transferencia internacional.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Derechos ARCO y derechos GDPR</h2>
          <p>Usted tiene derecho a:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Acceso:</strong> conocer qué datos personales tenemos sobre usted.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
            <li><strong>Cancelación / Supresión:</strong> solicitar la eliminación de sus datos.</li>
            <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos en determinadas circunstancias.</li>
            <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado (aplica GDPR).</li>
            <li><strong>Limitación:</strong> solicitar la restricción del tratamiento (aplica GDPR).</li>
          </ul>
          <p className="mt-3">
            Para ejercer cualquiera de estos derechos, envíe un correo a <a href="mailto:privacidad@chefflow.mx" className="text-brand-600 hover:underline">privacidad@chefflow.mx</a> con su nombre, correo de cuenta y descripción de la solicitud. Responderemos en un plazo máximo de 20 días hábiles (México) o 30 días (GDPR).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Retención de datos</h2>
          <p>
            Sus datos personales se conservan mientras mantenga una cuenta activa en ChefFlow. Una vez que cancele su cuenta, sus datos serán eliminados de forma permanente dentro de los <strong>30 días naturales</strong> siguientes a la cancelación, salvo que exista obligación legal de conservarlos por un período mayor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">9. Cookies</h2>
          <p>
            ChefFlow utiliza únicamente cookies técnicas estrictamente necesarias para el funcionamiento de la sesión y la autenticación. No utilizamos cookies de seguimiento, publicidad o analítica de terceros.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">10. Menores de edad</h2>
          <p>
            ChefFlow está dirigido exclusivamente a personas mayores de 18 años. No recopilamos conscientemente datos de menores de edad. Si detectamos que un menor ha proporcionado datos, los eliminaremos de inmediato.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">11. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta Política de Privacidad en cualquier momento. Le notificaremos por correo electrónico con al menos 15 días de anticipación ante cambios materiales. El uso continuado del servicio tras la notificación constituye la aceptación de la política actualizada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">12. Contacto</h2>
          <p>
            Para cualquier consulta sobre esta política o el tratamiento de sus datos personales:
          </p>
          <div className="mt-2 p-4 bg-slate-50 rounded-xl text-sm">
            <p><strong>ChefFlow</strong></p>
            <p>Correo: <a href="mailto:privacidad@chefflow.mx" className="text-brand-600 hover:underline">privacidad@chefflow.mx</a></p>
            <p>Sitio web: chefflow.mx</p>
            <p>Guadalajara, Jalisco, México</p>
          </div>
        </section>

      </div>
    </div>
  )
}
