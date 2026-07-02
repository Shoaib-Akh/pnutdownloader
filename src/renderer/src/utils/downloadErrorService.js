import { supabase, isSupabaseConfigured } from '../supabase'
import { getFeedbackDeviceContext } from './feedbackService'

const DOWNLOAD_ERRORS_TABLE = 'download_errors'
const STORAGE_KEY_DOWNLOAD_ERROR_QUEUE = 'pnut_download_error_queue'
const MAX_QUEUE_SIZE = 100

const clampText = (value, maxLength) =>
  String(value || '')
    .trim()
    .slice(0, maxLength)

const readQueue = () => {
  try {
    const storedQueue = localStorage.getItem(STORAGE_KEY_DOWNLOAD_ERROR_QUEUE)
    return storedQueue ? JSON.parse(storedQueue) : []
  } catch (error) {
    console.error('Failed to read download error queue:', error)
    return []
  }
}

const writeQueue = (queue) => {
  try {
    localStorage.setItem(
      STORAGE_KEY_DOWNLOAD_ERROR_QUEUE,
      JSON.stringify(queue.slice(-MAX_QUEUE_SIZE))
    )
  } catch (error) {
    console.error('Failed to save download error queue:', error)
  }
}

const queueDownloadError = (payload) => {
  const queue = readQueue()
  writeQueue([...queue, payload])
}

const getAppVersion = async () => {
  try {
    if (window.api?.getAppVersion) {
      return await window.api.getAppVersion()
    }
  } catch (error) {
    console.warn('Unable to read app version for download error logging:', error)
  }

  return 'unknown'
}

const getSupabaseAuthContext = async () => {
  if (!isSupabaseConfigured || !supabase?.auth) {
    return {
      auth_user_id: null,
      auth_user_email: null
    }
  }

  try {
    const { data } = await supabase.auth.getSession()
    const user = data?.session?.user || null

    return {
      auth_user_id: user?.id || null,
      auth_user_email: clampText(user?.email, 160) || null
    }
  } catch {
    return {
      auth_user_id: null,
      auth_user_email: null
    }
  }
}

const getDownloadErrorReason = (message, details) => {
  const text = `${message || ''} ${details || ''}`.toLowerCase()

  if (/sign in|login|logged-in|cookies|auth|oauth|age-restricted|authentication/.test(text)) {
    return 'auth_required'
  }

  if (/geo|region|country|not available in your country/.test(text)) {
    return 'geo_blocked'
  }

  if (/private|members-only|membership/.test(text)) {
    return 'private_or_members_only'
  }

  if (/video unavailable|not available|deleted|removed|not found|404/.test(text)) {
    return 'video_unavailable'
  }

  if (/network|connection|timeout|timed out|econnreset|enotfound/.test(text)) {
    return 'network_error'
  }

  if (/no video formats|format is not available|requested format|no formats/.test(text)) {
    return 'format_unavailable'
  }

  if (/yt-dlp|ffmpeg|download tools|media processor|failed to spawn|pyi-/.test(text)) {
    return 'tool_error'
  }

  if (/permission|access denied|eacces|eperm/.test(text)) {
    return 'permission_denied'
  }

  if (/unsupported|invalid url|not supported/.test(text)) {
    return 'unsupported_url'
  }

  if (/extract|metadata|parse json|empty output/.test(text)) {
    return 'metadata_error'
  }

  return 'unknown'
}

const buildDownloadErrorPayload = async (downloadData = {}, errorMessage = '') => {
  const createdAt = new Date().toISOString()
  const deviceContext = getFeedbackDeviceContext()
  const authContext = await getSupabaseAuthContext()
  const message =
    clampText(errorMessage || downloadData.lastError || 'Download failed', 1200) ||
    'Download failed'
  const details = clampText(downloadData.errorDetails || message, 4000) || null
  const platform = clampText(downloadData.platform || 'Unknown', 80) || 'Unknown'

  return {
    download_id: clampText(downloadData.id || 'unknown', 120) || 'unknown',
    title: clampText(downloadData.title || downloadData.filename || 'Unknown', 300) || 'Unknown',
    url: clampText(downloadData.url, 1000) || null,
    content_platform: platform,
    error_message: message,
    error_reason: getDownloadErrorReason(message, details),
    error_details: details,
    exit_code: Number.isFinite(Number(downloadData.errorExitCode))
      ? Number(downloadData.errorExitCode)
      : null,
    device_id: deviceContext.deviceId,
    device_name: deviceContext.deviceLabel,
    os_name: deviceContext.osName,
    platform: deviceContext.rawPlatform,
    device_type: deviceContext.deviceType,
    device_label: deviceContext.deviceLabel,
    download_type: clampText(downloadData.downloadType, 40) || null,
    format: clampText(downloadData.format, 40) || null,
    quality: clampText(downloadData.quality, 40) || null,
    bitrate: clampText(downloadData.bitrate, 40) || null,
    save_to: clampText(downloadData.saveTo, 500) || null,
    source: 'download_failed',
    app_version: await getAppVersion(),
    ...authContext,
    metadata: {
      language: deviceContext.language,
      userAgent: deviceContext.userAgent,
      screenResolution: deviceContext.screenResolution,
      timezone: deviceContext.timezone,
      reviewSurface: deviceContext.reviewSurface,
      status: downloadData.status || null,
      isPlaylist: Boolean(downloadData.isPlaylist),
      playlistTitle: downloadData.playlistTitle || null,
      playlistBatchId: downloadData.playlistBatchId || null,
      currentItem: downloadData.currentItem || null,
      totalItems: downloadData.totalItems || downloadData.playlistTotal || null,
      filePath: downloadData.filePath || null,
      createdAt
    },
    created_at: createdAt
  }
}

export const getQueuedDownloadErrorCount = () => readQueue().length

export const flushQueuedDownloadErrors = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { sent: 0, remaining: getQueuedDownloadErrorCount() }
  }

  const queue = readQueue()
  if (queue.length === 0) {
    return { sent: 0, remaining: 0 }
  }

  const remaining = []
  let sent = 0

  for (const payload of queue) {
    const { error } = await supabase.from(DOWNLOAD_ERRORS_TABLE).insert(payload)
    if (error) {
      remaining.push(payload)
    } else {
      sent += 1
    }
  }

  writeQueue(remaining)
  return { sent, remaining: remaining.length }
}

export const recordDownloadError = async (downloadData, errorMessage) => {
  const payload = await buildDownloadErrorPayload(downloadData, errorMessage)

  console.error('Download failed:', {
    downloadId: payload.download_id,
    title: payload.title,
    url: payload.url,
    platform: payload.content_platform,
    reason: payload.error_reason,
    error: payload.error_message,
    details: payload.error_details,
    exitCode: payload.exit_code,
    deviceId: payload.device_id,
    appVersion: payload.app_version,
    createdAt: payload.created_at
  })

  if (!isSupabaseConfigured || !supabase) {
    queueDownloadError(payload)
    return { status: 'queued', queued: true }
  }

  const { error } = await supabase.from(DOWNLOAD_ERRORS_TABLE).insert(payload)

  if (error) {
    console.error('Failed to save download error to Supabase:', error)
    queueDownloadError(payload)
    const retryResult = await flushQueuedDownloadErrors()
    return { status: 'queued', queued: true, error, retryResult }
  }

  const retryResult = await flushQueuedDownloadErrors()
  return { status: 'sent', queued: false, retryResult }
}
