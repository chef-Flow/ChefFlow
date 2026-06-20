import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY no está configurada')
    _resend = new Resend(key)
  }
  return _resend
}

export function buildRecetaCompartidaEmail({
  ownerName,
  recetaNombre,
  appUrl,
  token,
  tipo = 'receta',
}: {
  ownerName: string
  recetaNombre: string
  appUrl: string
  token: string
  tipo?: 'receta' | 'sub_receta'
}): string {
  const link = `${appUrl}/receta-compartida?token=${token}`
  const tipoLabel = tipo === 'sub_receta' ? 'sub-receta' : 'receta'
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Receta compartida en ChefFlow</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a3a2a,#2a7049);padding:32px;text-align:center;">
          <div style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-1px;">ChefFlow</div>
          <div style="font-size:13px;color:#d1e8d9;margin-top:4px;">Costeo inteligente para tu cocina</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">¡Te compartieron una ${tipoLabel}!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            <strong style="color:#1e293b;">${ownerName}</strong> te compartió la ${tipoLabel}
            <strong style="color:#1e293b;">"${recetaNombre}"</strong> en ChefFlow.
            Haz clic para verla.
          </p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>
              <td style="background:#1a3a2a;border-radius:10px;">
                <a href="${link}"
                  style="display:block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                  Ver ${tipoLabel} →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">
            O copia este enlace en tu navegador:
          </p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;word-break:break-all;">
            ${link}
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            Si no esperabas este mensaje, ignóralo. El enlace solo funciona para tu cuenta.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function buildInvitacionEmail({
  ownerName,
  appUrl,
  token,
}: {
  ownerName: string
  appUrl: string
  token: string
}): string {
  const link = `${appUrl}/invitacion?token=${token}`
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invitación a ChefFlow</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a3a2a,#2a7049);padding:32px;text-align:center;">
          <div style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-1px;">ChefFlow</div>
          <div style="font-size:13px;color:#d1e8d9;margin-top:4px;">Costeo inteligente para tu cocina</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 32px;">
          <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1e293b;">¡Te invitaron a colaborar!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            <strong style="color:#1e293b;">${ownerName}</strong> te invita a ver y gestionar sus menús en ChefFlow.
            Tendrás acceso a los menús que te asignen con los permisos definidos por el propietario.
          </p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>
              <td style="background:#1a3a2a;border-radius:10px;">
                <a href="${link}"
                  style="display:block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                  Aceptar invitación →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">
            O copia este enlace en tu navegador:
          </p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;word-break:break-all;">
            ${link}
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            Si no esperabas esta invitación, ignora este mensaje. Este enlace expira cuando sea cancelado.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}
