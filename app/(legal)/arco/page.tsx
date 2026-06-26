export const metadata = {
  title: 'Aviso de Privacidad ARCO · ChefFlow',
}

export default function ArcoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Aviso de Privacidad</h1>
      <p className="text-sm text-slate-500 mb-1">
        Conforme a la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares
        (LFPDPPP)</strong> y su Reglamento.
      </p>
      <p className="text-sm text-slate-400 mb-10">Última actualización: junio 2025</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Identidad y domicilio del responsable</h2>
          <p>
            <strong>ChefFlow</strong> (en adelante &ldquo;el Responsable&rdquo;), con presencia en{' '}
            Guadalajara, Jalisco, México, es responsable del uso y protección de sus datos personales.
          </p>
          <div className="mt-3 p-4 bg-slate-50 rounded-xl text-sm space-y-1">
            <p><strong>Nombre comercial:</strong> ChefFlow</p>
            <p><strong>Correo de contacto:</strong>{' '}
              <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">chefflow9@gmail.com</a>
            </p>
            <p><strong>Sitio web:</strong> chefflow.mx</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Datos personales que recabamos</h2>
          <p>Para cumplir con las finalidades descritas en este aviso, recabamos los siguientes datos personales:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Datos de identificación:</strong> correo electrónico.</li>
            <li><strong>Datos de autenticación:</strong> contraseña (almacenada en forma cifrada; nunca en texto plano).</li>
            <li>
              <strong>Datos de uso del servicio:</strong> recetas, ingredientes, precios, sub-recetas, menús,
              proveedores, costos y notas que usted registra en la plataforma.
            </li>
            <li>
              <strong>Datos de pago:</strong> procesados directamente por Stripe Inc. El Responsable{' '}
              <strong>no almacena</strong> números de tarjeta, CVV ni datos bancarios en sus propios servidores.
            </li>
            <li>
              <strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo y páginas
              visitadas, recabados automáticamente con fines de seguridad y mejora del servicio.
            </li>
          </ul>
          <p className="mt-3">
            <strong>No recabamos</strong> datos personales sensibles (origen étnico, estado de salud, creencias
            religiosas, datos biométricos, orientación sexual, ni opiniones políticas).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Finalidades del tratamiento</h2>
          <p className="font-semibold text-slate-800 mb-2">Finalidades primarias (necesarias para el servicio):</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Crear y administrar su cuenta de usuario.</li>
            <li>Prestar el servicio de costeo y gestión de recetas.</li>
            <li>Procesar pagos y gestionar su suscripción.</li>
            <li>Enviar comunicaciones transaccionales (confirmaciones de pago, alertas de cuenta).</li>
            <li>Atender solicitudes de soporte técnico.</li>
            <li>Cumplir con obligaciones legales aplicables.</li>
          </ul>
          <p className="font-semibold text-slate-800 mt-4 mb-2">Finalidades secundarias (opcionales):</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Enviar comunicaciones sobre nuevas funciones, actualizaciones o promociones del servicio.</li>
            <li>Realizar análisis estadísticos agregados y anónimos para mejorar la plataforma.</li>
          </ul>
          <p className="mt-3">
            Si usted no desea que sus datos sean tratados para las finalidades secundarias, puede manifestarlo
            enviando un correo a{' '}
            <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">
              chefflow9@gmail.com
            </a>{' '}
            con el asunto <em>&ldquo;Oposición a finalidades secundarias&rdquo;</em>. La negativa no afectará
            el acceso al servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Transferencias de datos personales</h2>
          <p>
            Sus datos personales pueden ser transferidos a terceros en los siguientes casos, todos necesarios
            para la prestación del servicio:
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 border border-slate-200 font-semibold">Tercero</th>
                  <th className="text-left p-3 border border-slate-200 font-semibold">Finalidad</th>
                  <th className="text-left p-3 border border-slate-200 font-semibold">Requiere consentimiento</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Supabase Inc.', 'Almacenamiento de base de datos (PostgreSQL)', 'No — ejecución del contrato'],
                  ['Stripe Inc.', 'Procesamiento seguro de pagos (PCI DSS Nivel 1)', 'No — ejecución del contrato'],
                  ['Resend Inc.', 'Envío de correos transaccionales', 'No — ejecución del contrato'],
                  ['Vercel Inc.', 'Alojamiento de la aplicación web', 'No — ejecución del contrato'],
                ].map(([tercero, fin, consent], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 border border-slate-200 font-medium">{tercero}</td>
                    <td className="p-3 border border-slate-200">{fin}</td>
                    <td className="p-3 border border-slate-200 text-slate-500">{consent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            No vendemos, alquilamos ni compartimos sus datos personales con terceros con fines comerciales
            o publicitarios. Las transferencias indicadas se realizan bajo contratos de confidencialidad y
            conforme al artículo 37 de la LFPDPPP.
          </p>
          <p className="mt-2">
            Los datos se almacenan en servidores ubicados en <strong>Estados Unidos de América</strong>.
            Al utilizar el servicio, usted consiente expresamente dicha transferencia internacional conforme
            a los artículos 36 y 37 de la LFPDPPP.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Derechos ARCO</h2>
          <p>
            De conformidad con la LFPDPPP, usted tiene derecho a ejercer en cualquier momento los siguientes
            derechos sobre sus datos personales:
          </p>
          <div className="mt-4 space-y-4">
            {[
              {
                letra: 'A',
                nombre: 'Acceso',
                desc: 'Conocer qué datos personales tenemos en nuestra posesión, para qué los utilizamos y las condiciones de uso que les damos.',
              },
              {
                letra: 'R',
                nombre: 'Rectificación',
                desc: 'Solicitar la corrección de sus datos personales en caso de que estén desactualizados, sean inexactos o incompletos.',
              },
              {
                letra: 'C',
                nombre: 'Cancelación',
                desc: 'Solicitar la eliminación de sus datos de nuestros registros o bases de datos cuando considere que no están siendo utilizados conforme a los principios y deberes establecidos por la normativa.',
              },
              {
                letra: 'O',
                nombre: 'Oposición',
                desc: 'Oponerse al uso de sus datos personales para finalidades específicas, en particular las finalidades secundarias descritas en la sección 3.',
              },
            ].map(({ letra, nombre, desc }) => (
              <div key={letra} className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {letra}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{nombre}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Cómo ejercer sus derechos ARCO</h2>
          <p>Para ejercer cualquiera de sus derechos ARCO, envíe una solicitud a:</p>
          <div className="mt-2 p-4 bg-slate-50 rounded-xl text-sm">
            <p><strong>Correo:</strong>{' '}
              <a href="mailto:chefflow9@gmail.com" className="text-brand-600 hover:underline">chefflow9@gmail.com</a>
            </p>
            <p className="mt-1"><strong>Asunto:</strong> Solicitud de Derechos ARCO</p>
          </div>
          <p className="mt-3">Su solicitud debe incluir:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Nombre completo y correo electrónico asociado a su cuenta en ChefFlow.</li>
            <li>Descripción clara del derecho que desea ejercer (Acceso, Rectificación, Cancelación u Oposición).</li>
            <li>Cualquier documento o información que facilite la localización de sus datos.</li>
          </ul>
          <p className="mt-3">
            Responderemos su solicitud en un plazo máximo de <strong>20 días hábiles</strong> a partir de su
            recepción. Si la solicitud es procedente, se ejecutará dentro de los <strong>15 días hábiles</strong>{' '}
            siguientes a la respuesta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Revocación del consentimiento</h2>
          <p>
            Usted puede revocar el consentimiento otorgado para el tratamiento de sus datos personales en
            cualquier momento, siempre y cuando no lo impida una disposición legal. Para hacerlo, siga el
            mismo procedimiento descrito en la sección 6. Tenga en cuenta que la revocación puede implicar
            la imposibilidad de continuar utilizando el servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">8. Uso de cookies y tecnologías de rastreo</h2>
          <p>
            ChefFlow utiliza únicamente <strong>cookies técnicas estrictamente necesarias</strong> para la
            autenticación y funcionamiento de la sesión. No utilizamos cookies de rastreo, publicidad
            comportamental ni analítica de terceros. Puede configurar su navegador para rechazar cookies,
            aunque esto puede afectar el funcionamiento de la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">9. Conservación de datos</h2>
          <p>
            Sus datos personales se conservan mientras mantenga una cuenta activa. Una vez que solicite la
            eliminación de su cuenta, sus datos serán suprimidos de forma definitiva dentro de los{' '}
            <strong>30 días naturales</strong> siguientes a la confirmación de la solicitud, salvo que
            exista obligación legal de conservarlos por un plazo mayor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">10. Cambios al aviso de privacidad</h2>
          <p>
            El presente aviso puede ser modificado en cualquier momento. Las modificaciones se publicarán
            en esta misma página con la fecha de actualización correspondiente. Cuando los cambios sean
            materiales, le notificaremos por correo electrónico con al menos <strong>15 días</strong> de
            anticipación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">11. Autoridad competente</h2>
          <p>
            Si considera que su derecho a la protección de datos personales ha sido vulnerado, puede
            presentar una queja ante el{' '}
            <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos
            Personales (INAI)</strong> a través de su sitio web{' '}
            <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
              www.inai.org.mx
            </a>.
          </p>
        </section>

      </div>
    </div>
  )
}
