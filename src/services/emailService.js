import emailjs from '@emailjs/browser'
import { saveGuardianEmail } from './storage'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const isConfigured = Boolean(serviceId && templateId && publicKey)

/**
 * Send a REAL email via EmailJS and log it locally.
 * Falls back to prototype (localStorage only) when credentials are missing.
 */
export async function sendGuardianEmail(profile, message, options = {}) {
  const guardianEmail = profile?.guardian?.email
  if (!guardianEmail) {
    throw new Error('No guardian email is configured. Add guardian email in settings first.')
  }

  const userName = profile?.name || 'Drishti user'
  const guardianName = profile?.guardian?.name || 'Guardian'
  const subject = options.subject || `Message from ${userName}`

  // Always save locally for history
  const savedEmail = saveGuardianEmail({
    to: guardianEmail,
    guardian_name: guardianName,
    user_name: userName,
    subject,
    message,
    emergency: Boolean(options.emergency),
  })

  if (!isConfigured) {
    console.warn('[Drishti] EmailJS not configured – email saved locally only. Add VITE_EMAILJS_* to .env.local.')
    return { email: savedEmail, mode: 'prototype' }
  }

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: guardianEmail,
        to_name: guardianName,
        from_name: userName,
        subject,
        message,
      },
      publicKey,
    )
    return { email: { ...savedEmail, status: 'sent' }, mode: 'emailjs' }
  } catch (error) {
    console.error('[Drishti] EmailJS send failed:', error)
    throw new Error(`Email delivery failed: ${error?.text || error?.message || 'Unknown error'}. The message was saved locally.`)
  }
}
