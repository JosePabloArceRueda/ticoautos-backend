const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Send account verification email with a unique activation link.
 */
async function sendVerificationEmail(user, token) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;

  const msg = {
    to: user.email,
    from: FROM_EMAIL,
    subject: 'Activa tu cuenta en TicoAutos',
    text: `Hola ${user.name}, activa tu cuenta ingresando al siguiente enlace: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Bienvenido a TicoAutos, ${user.name}</h2>
        <p>Para activar tu cuenta hacé clic en el siguiente botón:</p>
        <a href="${verificationUrl}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:bold;">
          Activar cuenta
        </a>
        <p style="margin-top:16px;color:#6b7280;font-size:14px;">
          Este enlace expira en 24 horas. Si no creaste esta cuenta podés ignorar este correo.
        </p>
      </div>
    `,
  };

  await sgMail.send(msg);
}

module.exports = { sendVerificationEmail };
