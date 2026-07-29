/** Branded TRYST OTP email — dark, discreet, high-contrast */

export function buildOtpEmailHtml(opts: {
    code: string
    email: string
    expiresMinutes?: number
    appUrl?: string
}) {
    const { code, email, expiresMinutes = 10, appUrl = 'http://localhost:3000' } = opts
    const digits = code.split('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your TRYST code</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#121212;border:1px solid #2a2a2a;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#C0392B,#D4AF37,#C0392B);"></td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#D4AF37;">TRYST</p>
              <h1 style="margin:14px 0 0;font-size:28px;font-weight:700;color:#F5F0E8;letter-spacing:-0.02em;">Your secret code</h1>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#9A9488;font-family:Arial,Helvetica,sans-serif;">
                Enter this code to continue. It expires in <strong style="color:#D4AF37;">${expiresMinutes} minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  ${digits
                      .map(
                          (d) => `
                  <td style="padding:0 4px;">
                    <div style="width:44px;height:54px;border-radius:12px;border:1px solid rgba(192,57,43,0.45);background:#1a1212;color:#F5F0E8;font-size:24px;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:54px;text-align:center;">${d}</div>
                  </td>`,
                      )
                      .join('')}
                </tr>
              </table>
              <p style="margin:20px 0 0;text-align:center;font-size:22px;letter-spacing:0.35em;font-weight:700;color:#C0392B;font-family:Arial,Helvetica,sans-serif;">
                ${code}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;text-align:center;">
              <a href="${appUrl}/login" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#C0392B;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.04em;">
                Open TRYST
              </a>
              <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#6B655C;font-family:Arial,Helvetica,sans-serif;">
                Sent to ${email}. If you didn&apos;t request this, ignore this email — your story stays private.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="margin:0;font-size:11px;color:#5A544C;font-style:italic;">&quot;Your Secret. Your Story.&quot;</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildOtpEmailText(code: string, expiresMinutes = 10) {
    return `TRYST verification code: ${code}\n\nThis code expires in ${expiresMinutes} minutes.\nIf you didn't request it, ignore this email.`
}
