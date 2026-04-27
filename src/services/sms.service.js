const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Generate a 6-digit OTP code.
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send a 2FA SMS code to the given phone number.
 * In Twilio trial accounts, the destination number must be verified
 * in the Twilio console
 */
async function sendSMSCode(toPhone, code) {
  const formattedPhone = toPhone.startsWith('+') ? toPhone : `+506${toPhone}`;

  await client.messages.create({
    body: `Tu código de verificación TicoAutos es: ${code}. Expira en 10 minutos.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: formattedPhone,
  });
}

module.exports = { generateOTP, sendSMSCode };
