import { supabase, isSupabaseConfigured } from '../supabase'
import { getFeedbackDeviceContext } from './feedbackService'

const DONATION_CLICK_TABLE = 'donation_clicks'
const STORAGE_KEY_DONATION_QUEUE = 'pnut_donation_click_queue'
const MAX_QUEUE_SIZE = 100

const clampText = (value, maxLength) =>
  String(value || '')
    .trim()
    .slice(0, maxLength)

const readQueue = () => {
  try {
    const storedQueue = localStorage.getItem(STORAGE_KEY_DONATION_QUEUE)
    return storedQueue ? JSON.parse(storedQueue) : []
  } catch (error) {
    console.error('Failed to read donation click queue:', error)
    return []
  }
}

const writeQueue = (queue) => {
  try {
    localStorage.setItem(STORAGE_KEY_DONATION_QUEUE, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)))
  } catch (error) {
    console.error('Failed to save donation click queue:', error)
  }
}

const queueDonationClick = (payload) => {
  const queue = readQueue()
  writeQueue([...queue, payload])
}

const getAppVersion = async () => {
  try {
    if (window.api?.getAppVersion) {
      return await window.api.getAppVersion()
    }
  } catch (error) {
    console.warn('Unable to read app version for donation tracking:', error)
  }

  return 'unknown'
}

const buildDonationClickPayload = async ({ button, label, targetUrl }) => {
  const deviceContext = getFeedbackDeviceContext()
  const createdAt = new Date().toISOString()

  return {
    button_action: clampText(button, 60) || 'unknown',
    button_label: clampText(label, 80) || 'Unknown',
    target_url: clampText(targetUrl, 500) || null,
    device_id: deviceContext.deviceId,
    device_name: deviceContext.deviceLabel,
    os_name: deviceContext.osName,
    platform: deviceContext.rawPlatform,
    device_type: deviceContext.deviceType,
    device_label: deviceContext.deviceLabel,
    source: 'donation_modal',
    app_version: await getAppVersion(),
    metadata: {
      language: deviceContext.language,
      userAgent: deviceContext.userAgent,
      screenResolution: deviceContext.screenResolution,
      timezone: deviceContext.timezone,
      reviewSurface: deviceContext.reviewSurface,
      createdAt
    },
    created_at: createdAt
  }
}

export const getQueuedDonationClickCount = () => readQueue().length

export const flushQueuedDonationClicks = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { sent: 0, remaining: getQueuedDonationClickCount() }
  }

  const queue = readQueue()
  if (queue.length === 0) {
    return { sent: 0, remaining: 0 }
  }

  const remaining = []
  let sent = 0

  for (const payload of queue) {
    const { error } = await supabase.from(DONATION_CLICK_TABLE).insert(payload)
    if (error) {
      remaining.push(payload)
    } else {
      sent += 1
    }
  }

  writeQueue(remaining)
  return { sent, remaining: remaining.length }
}

export const recordDonationClick = async ({ button, label, targetUrl }) => {
  const payload = await buildDonationClickPayload({ button, label, targetUrl })

  if (!isSupabaseConfigured || !supabase) {
    queueDonationClick(payload)
    return { status: 'queued', queued: true }
  }

  const { error } = await supabase.from(DONATION_CLICK_TABLE).insert(payload)

  if (error) {
    console.error('Failed to save donation click to Supabase:', error)
    queueDonationClick(payload)
    const retryResult = await flushQueuedDonationClicks()
    return { status: 'queued', queued: true, error, retryResult }
  }

  const retryResult = await flushQueuedDonationClicks()
  return { status: 'sent', queued: false, retryResult }
}

export const trackDonationButton = ({ button, label, targetUrl }) => {
  recordDonationClick({ button, label, targetUrl })
    .then((result) => {
      window.api?.trackEvent?.('donation_click_recorded', {
        button,
        queued: result.queued
      })
    })
    .catch((error) => {
      console.error('Failed to record donation click:', error)
      window.api?.trackEvent?.('donation_click_tracking_failed', { button })
    })
}
