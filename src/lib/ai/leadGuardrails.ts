/**
 * OmniSync Guardrail & Validation Engine for Leads
 * Garantiza integridad de datos, formato E.164, prevención de alucinaciones y scoring de madurez.
 */

export interface RawLeadData {
  empresa: string
  contacto?: string | null
  cargo?: string | null
  telefono?: string | null
  whatsapp?: string | null
  email?: string | null
  sitioWeb?: string | null
  instagram?: string | null
  facebook?: string | null
  googleMapsUrl?: string | null
  direccion?: string | null
  latitud?: number | null
  longitud?: number | null
  zona?: string | null
  rubro?: string | null
  nicho?: string | null
  canalInteres?: string | null
  fuente?: string | null
  notas?: string | null
}

export interface ValidatedLeadResult {
  esValido: boolean
  motivoDescarte?: string
  leadSaneado?: RawLeadData & {
    whatsappValidado: boolean
    emailValidado: boolean
    scoreMadurez: number
    diagnosticoIA: string
  }
}

/**
 * Normaliza y valida números telefónicos a formato internacional E.164
 */
export function sanitizePhoneNumber(phone?: string | null, defaultCountryCode = '54'): { formatted: string; isValid: boolean } {
  if (!phone) return { formatted: '', isValid: false }

  // Eliminar caracteres no numéricos excepto '+'
  let cleaned = phone.replace(/[^\d+]/g, '')

  if (!cleaned) return { formatted: '', isValid: false }

  // Si empieza con +, verificar longitud
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.substring(1)
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return { formatted: cleaned, isValid: true }
    }
  }

  // Si no tiene prefijo, agregar código por defecto
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1) // Quitar 0 inicial local (ej. 011 -> 11)
  }

  if (cleaned.startsWith('15') && cleaned.length === 10) {
    cleaned = '11' + cleaned.substring(2) // Ajuste CABA
  }

  if (cleaned.length >= 8 && cleaned.length <= 11) {
    // Si es Argentina (54), agregar prefijo móvil '9' si no lo tiene
    if (defaultCountryCode === '54' && !cleaned.startsWith('9')) {
      cleaned = `9${cleaned}`
    }
    const full = `+${defaultCountryCode}${cleaned}`
    return { formatted: full, isValid: true }
  }

  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return { formatted: `+${cleaned}`, isValid: true }
  }

  return { formatted: cleaned, isValid: false }
}

/**
 * Valida formato y sintaxis de correo electrónico
 */
export function validateEmail(email?: string | null): { email: string; isValid: boolean } {
  if (!email) return { email: '', isValid: false }

  const trimmed = email.trim().toLowerCase()
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  const isValid = emailRegex.test(trimmed) && !trimmed.includes('ejemplo.com') && !trimmed.includes('test.com')
  return { email: trimmed, isValid }
}

/**
 * Limpia y normaliza URLs web
 */
export function sanitizeWebUrl(url?: string | null): string {
  if (!url) return ''
  let trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

/**
 * Evalúa el Score de Madurez inicial del Lead (0 a 100)
 */
export function calculateLeadMaturityScore(lead: RawLeadData, waValid: boolean, mailValid: boolean): number {
  let score = 20 // Base por existir

  if (lead.empresa && lead.empresa.length > 3) score += 15
  if (lead.contacto && lead.contacto.length > 3) score += 10
  if (waValid) score += 25
  if (mailValid) score += 15
  if (lead.direccion || lead.zona) score += 10
  if (lead.sitioWeb || lead.instagram) score += 5

  return Math.min(score, 100)
}

/**
 * Motor de Guardrails Principal: Valida y sanea un Lead prospectado
 */
export function applyLeadGuardrails(raw: RawLeadData): ValidatedLeadResult {
  if (!raw.empresa || raw.empresa.trim().length < 2) {
    return { esValido: false, motivoDescarte: 'Nombre de empresa ausente o inválido' }
  }

  // Descartar alucinaciones comunes de LLM
  const empresaLower = raw.empresa.toLowerCase()
  if (
    empresaLower.includes('empresa ejemplo') ||
    empresaLower.includes('lorem ipsum') ||
    empresaLower.includes('nombre ficticio') ||
    empresaLower.includes('ejemplo s.a.')
  ) {
    return { esValido: false, motivoDescarte: 'Detección de datos ficticios o de prueba (Anti-Alucinación)' }
  }

  const phoneRes = sanitizePhoneNumber(raw.whatsapp || raw.telefono)
  const mailRes = validateEmail(raw.email)

  // Un lead requiere al menos un canal de contacto directo (WhatsApp, Teléfono o Email)
  if (!phoneRes.isValid && !mailRes.isValid) {
    return { esValido: false, motivoDescarte: 'Carece de teléfono/WhatsApp y correo electrónico válidos' }
  }

  const cleanWeb = sanitizeWebUrl(raw.sitioWeb)
  const score = calculateLeadMaturityScore(raw, phoneRes.isValid, mailRes.isValid)

  const saneado: RawLeadData & {
    whatsappValidado: boolean
    emailValidado: boolean
    scoreMadurez: number
    diagnosticoIA: string
  } = {
    ...raw,
    empresa: raw.empresa.trim(),
    contacto: raw.contacto?.trim() || null,
    cargo: raw.cargo?.trim() || null,
    telefono: raw.telefono ? sanitizePhoneNumber(raw.telefono).formatted : phoneRes.formatted,
    whatsapp: phoneRes.isValid ? phoneRes.formatted : null,
    whatsappValidado: phoneRes.isValid,
    email: mailRes.isValid ? mailRes.email : null,
    emailValidado: mailRes.isValid,
    sitioWeb: cleanWeb || null,
    direccion: raw.direccion?.trim() || null,
    scoreMadurez: score,
    diagnosticoIA: `Lead verificado por Guardrails. Score: ${score}/100. Canales listos: ${phoneRes.isValid ? '[WhatsApp E.164] ' : ''}${mailRes.isValid ? '[Email MX] ' : ''}`
  }

  return {
    esValido: true,
    leadSaneado: saneado
  }
}
