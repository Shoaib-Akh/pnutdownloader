import { supabase, isSupabaseConfigured } from '../supabase'
import { getDeviceId } from './userTracking'

const FEEDBACK_TABLE = 'feedback'
const STORAGE_KEY_FEEDBACK_QUEUE = 'pnut_feedback_queue'
const MAX_QUEUE_SIZE = 25

const clampText = (value, maxLength) =>
  String(value || '')
    .trim()
    .slice(0, maxLength)

const readQueue = () => {
  try {
    const storedQueue = localStorage.getItem(STORAGE_KEY_FEEDBACK_QUEUE)
    return storedQueue ? JSON.parse(storedQueue) : []
  } catch (error) {
    console.error('Failed to read feedback queue:', error)
    return []
  }
}

const writeQueue = (queue) => {
  try {
    localStorage.setItem(STORAGE_KEY_FEEDBACK_QUEUE, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)))
  } catch (error) {
    console.error('Failed to save feedback queue:', error)
  }
}

const queueFeedback = (payload) => {
  const queue = readQueue()
  writeQueue([...queue, payload])
}

const getReviewSurface = () => {
  if (window.api) return 'Electron app'
  return 'Web renderer'
}

const getScreenResolution = () => `${window.screen.width}x${window.screen.height}`

const detectDevicePlatform = () => {
  const rawPlatform = navigator.platform || 'unknown'
  const userAgent = navigator.userAgent || ''
  const maxTouchPoints = navigator.maxTouchPoints || 0
  const isIpadOs = rawPlatform === 'MacIntel' && maxTouchPoints > 1

  if (/iPad/i.test(userAgent) || isIpadOs) {
    return {
      osName: 'iPadOS',
      deviceType: 'Tablet',
      deviceLabel: 'iPad'
    }
  }

  if (/iPhone|iPod/i.test(userAgent)) {
    return {
      osName: 'iOS',
      deviceType: 'Phone',
      deviceLabel: 'iPhone'
    }
  }

  if (/Windows/i.test(userAgent) || /^Win/i.test(rawPlatform)) {
    return {
      osName: 'Windows',
      deviceType: /Mobile/i.test(userAgent) ? 'Phone' : 'Desktop/Laptop',
      deviceLabel: /Mobile/i.test(userAgent) ? 'Windows Phone' : 'Windows Desktop/Laptop'
    }
  }

  if (/Mac OS X|Macintosh/i.test(userAgent) || /^Mac/i.test(rawPlatform)) {
    return {
      osName: 'macOS',
      deviceType: 'Desktop/Laptop',
      deviceLabel: 'Mac Desktop/Laptop'
    }
  }

  if (/Android/i.test(userAgent)) {
    const isMobile = /Mobile/i.test(userAgent)
    return {
      osName: 'Android',
      deviceType: isMobile ? 'Phone' : 'Tablet',
      deviceLabel: isMobile ? 'Android Phone' : 'Android Tablet'
    }
  }

  if (/Linux/i.test(userAgent) || /^Linux/i.test(rawPlatform)) {
    return {
      osName: 'Linux',
      deviceType: 'Desktop/Laptop',
      deviceLabel: 'Linux Desktop/Laptop'
    }
  }

  return {
    osName: 'Unknown',
    deviceType: maxTouchPoints > 1 ? 'Touch device' : 'Desktop/Laptop',
    deviceLabel: rawPlatform === 'unknown' ? 'Unknown device' : rawPlatform
  }
}

export const getFeedbackDeviceContext = () => {
  const detectedPlatform = detectDevicePlatform()

  return {
    deviceId: getDeviceId(),
    rawPlatform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent || 'unknown',
    language: navigator.language || 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    screenResolution: getScreenResolution(),
    reviewSurface: getReviewSurface(),
    ...detectedPlatform
  }
}

const getAppVersion = async () => {
  try {
    if (window.api?.getAppVersion) {
      return await window.api.getAppVersion()
    }
  } catch (error) {
    console.warn('Unable to read app version for feedback:', error)
  }

  return 'unknown'
}

const buildFeedbackPayload = async (feedbackData) => {
  const rating = Number(feedbackData.rating)
  const createdAt = new Date().toISOString()
  const deviceContext = getFeedbackDeviceContext()

  return {
    rating,
    category: clampText(feedbackData.category || 'general', 40),
    name: clampText(feedbackData.name, 80) || null,
    email: clampText(feedbackData.email, 120) || null,
    message: clampText(feedbackData.message || feedbackData.suggestion, 1200) || null,
    device_id: deviceContext.deviceId,
    platform: deviceContext.rawPlatform,
    os_name: deviceContext.osName,
    device_type: deviceContext.deviceType,
    device_label: deviceContext.deviceLabel,
    review_surface: deviceContext.reviewSurface,
    app_version: await getAppVersion(),
    source: 'in_app_review',
    status: 'new',
    metadata: {
      language: deviceContext.language,
      userAgent: deviceContext.userAgent,
      screenResolution: deviceContext.screenResolution,
      timezone: deviceContext.timezone,
      rawPlatform: deviceContext.rawPlatform,
      createdAt
    },
    created_at: createdAt
  }
}

export const getQueuedFeedbackCount = () => readQueue().length

export const flushQueuedFeedback = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { sent: 0, remaining: getQueuedFeedbackCount() }
  }

  const queue = readQueue()
  if (queue.length === 0) {
    return { sent: 0, remaining: 0 }
  }

  const remaining = []
  let sent = 0

  for (const payload of queue) {
    const { error } = await supabase.from(FEEDBACK_TABLE).insert(payload)
    if (error) {
      remaining.push(payload)
    } else {
      sent += 1
    }
  }

  writeQueue(remaining)
  return { sent, remaining: remaining.length }
}

export const saveUserFeedback = async (feedbackData) => {
  const payload = await buildFeedbackPayload(feedbackData)

  if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
    throw new Error('Please select a rating before submitting feedback.')
  }

  if (!isSupabaseConfigured || !supabase) {
    queueFeedback(payload)
    return { status: 'queued', queued: true }
  }

  const { error } = await supabase.from(FEEDBACK_TABLE).insert(payload)

  if (error) {
    console.error('Failed to save feedback to Supabase:', error)
    queueFeedback(payload)
    return { status: 'queued', queued: true, error }
  }

  const retryResult = await flushQueuedFeedback()
  return { status: 'sent', queued: false, retryResult }
}
