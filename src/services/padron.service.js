const TSE_API_URL = process.env.TSE_API_URL || 'http://localhost:4000/api/v2/cedula';
const MIN_AGE = 18;

/**
 * Query the TSE padrón API for a given cedula.
 * Returns person data or null if not found.
 */
async function lookupCedula(cedula) {
  const response = await fetch(`${TSE_API_URL}/cedula=${cedula}`);

  if (!response.ok) {
    throw new Error(`TSE API responded with status ${response.status}`);
  }

  const data = await response.text();

  // API returns plain text "Persona no encontrada" when cedula doesn't exist
  if (data.trim() === 'Persona no encontrada') {
    return null;
  }

  return JSON.parse(data);
}

/**
 * Parse a birthdate string in either DD/MM/YYYY or YYYY-MM-DD format.
 */
function parseBirthDate(birthDateStr) {
  // DD/MM/YYYY (format returned by the real TSE API)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthDateStr)) {
    const [day, month, year] = birthDateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  }
  // YYYY-MM-DD fallback
  return new Date(birthDateStr);
}

/**
 * Calculate age in years from a birthdate string.
 */
function calculateAge(birthDateStr) {
  const birth = parseBirthDate(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validate cedula against the TSE padrón and check minimum age.
 * Returns { valid, person, age, error }
 */
async function validateCedula(cedula) {
  let person;

  try {
    person = await lookupCedula(cedula);
  } catch (err) {
    return { valid: false, error: 'No se pudo conectar con el servicio del TSE' };
  }

  if (!person) {
    return { valid: false, error: 'La cédula no existe en el padrón electoral' };
  }

  const age = calculateAge(person.fechaNacimiento);

  if (age < MIN_AGE) {
    return { valid: false, error: `Debes ser mayor de ${MIN_AGE} años para registrarte` };
  }

  return { valid: true, person, age };
}

module.exports = { validateCedula, parseBirthDate };
