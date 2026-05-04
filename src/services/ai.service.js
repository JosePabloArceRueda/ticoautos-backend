const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Eres un moderador de mensajes para una plataforma de compraventa de vehículos en Costa Rica.
Tu única tarea es detectar si un mensaje contiene información de contacto que permita a los usuarios comunicarse fuera de la plataforma.

Considera como información de contacto:
- Números de teléfono (cualquier formato, incluyendo costarricenses de 8 dígitos)
- Correos electrónicos
- Usuarios de redes sociales (Instagram, Facebook, WhatsApp, Telegram, TikTok, etc.)
- URLs o enlaces
- Números de WhatsApp
- Cualquier intento de compartir datos para contacto externo

Responde ÚNICAMENTE con un objeto JSON sin markdown, sin explicaciones adicionales:
{"detected": true/false, "reason": "explicación breve en español si detected es true, sino null"}`;

async function containsContactInfo(text) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Mensaje: "${text}"` },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return { detected: Boolean(result.detected), reason: result.reason || null };
  } catch (error) {
    console.error('[AI] Error al validar mensaje, se permite el envío:', error.message);
    return { detected: false, reason: null };
  }
}

module.exports = { containsContactInfo };
