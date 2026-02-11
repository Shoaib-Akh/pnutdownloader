import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { getDeviceId } from './userTracking'

const STORAGE_KEY_LAST_SYNC = 'pnut_last_firestore_sync'
const STORAGE_KEY_DOWNLOAD_LIST = 'downloadList'

/**
 * Firestore Service Layer
 * Handles all Firestore operations with localStorage sync for offline support
 */
class FirestoreService {
  constructor() {
    this.deviceId = getDeviceId()
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.syncLocalStorageToFirestore()
    })
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  /**
   * Check if Firestore is available
   */
  async isFirestoreAvailable() {
    try {
      // Try a simple read operation to test connectivity
      const testDoc = doc(firestore, '_test', 'connection')
      await getDoc(testDoc)
      return true
    } catch (error) {
      // Check if it's a permissions error
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Firestore permissions error. Please check your Firestore security rules.')
        return false
      }
      console.warn('Firestore not available:', error.message)
      return false
    }
  }

  /**
   * Get all downloads from Firestore
   */
  async getDownloads() {
    try {
      if (!(await this.isFirestoreAvailable())) {
        // Fallback to localStorage
        return this.getDownloadsFromLocalStorage()
      }

      const downloadsRef = collection(firestore, 'downloads')
      // First get all downloads for this device, then sort in memory to avoid index requirement
      const q = query(
        downloadsRef,
        where('deviceId', '==', this.deviceId),
        limit(1000)
      )
      
      const querySnapshot = await getDocs(q)
      const downloads = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        // Convert Firestore Timestamp to ISO string for compatibility
        const downloadDate = data.downloadDate?.toDate?.()?.toISOString() || data.downloadDate || new Date().toISOString()
        downloads.push({
          id: doc.id,
          ...data,
          downloadDate
        })
      })

      // Sort by downloadDate in memory (descending - newest first)
      downloads.sort((a, b) => {
        const dateA = new Date(a.downloadDate || 0).getTime()
        const dateB = new Date(b.downloadDate || 0).getTime()
        return dateB - dateA // Descending order
      })

      // Update localStorage with Firestore data
      localStorage.setItem(STORAGE_KEY_DOWNLOAD_LIST, JSON.stringify(downloads))
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, Date.now().toString())

      return downloads
    } catch (error) {
      // Handle permissions error gracefully
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Firestore permissions denied. Using localStorage only. Please update Firestore security rules.')
        return this.getDownloadsFromLocalStorage()
      }
      console.error('Error getting downloads from Firestore:', error)
      // Fallback to localStorage
      return this.getDownloadsFromLocalStorage()
    }
  }

  /**
   * Get downloads from localStorage (fallback)
   */
  getDownloadsFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_DOWNLOAD_LIST)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return []
    }
  }

  /**
   * Add or update a download in Firestore and localStorage
   */
  async saveDownload(downloadData) {
    try {
      // Always save to localStorage first (for offline support)
      const downloads = this.getDownloadsFromLocalStorage()
      const existingIndex = downloads.findIndex(d => d.id === downloadData.id)
      
      if (existingIndex >= 0) {
        downloads[existingIndex] = { ...downloads[existingIndex], ...downloadData }
      } else {
        downloads.unshift(downloadData)
      }
      
      localStorage.setItem(STORAGE_KEY_DOWNLOAD_LIST, JSON.stringify(downloads))

      // Try to save to Firestore if online
      if (await this.isFirestoreAvailable()) {
        try {
          const userRef = doc(firestore, 'users', this.deviceId)
          const platform = downloadData.platform || 'Unknown'
          
          await setDoc(userRef, {
            totalDownloads: increment(1),
            [`platforms.${platform}`]: increment(1),
            lastDownloadAt: serverTimestamp(),
            deviceId: this.deviceId,
            updatedAt: serverTimestamp()
          }, { merge: true })
          
          console.log(`✅ Download count updated in Firestore for platform: ${platform}`)
        } catch (firestoreError) {
          // Handle permissions error silently - data is already in localStorage
          if (firestoreError.code === 'permission-denied') {
            console.warn('⚠️ Firestore write permission denied. Data saved to localStorage only.')
          } else {
            throw firestoreError
          }
        }
      }
    } catch (error) {
      console.error('Error saving download:', error)
      // Data is already in localStorage, so app continues to work
    }
  }

  /**
   * Delete a download from Firestore and localStorage
   */
  async deleteDownload(downloadId) {
    try {
      // Delete from localStorage
      const downloads = this.getDownloadsFromLocalStorage()
      const filtered = downloads.filter(d => d.id !== downloadId)
      localStorage.setItem(STORAGE_KEY_DOWNLOAD_LIST, JSON.stringify(filtered))

      // Delete from Firestore if online
      if (await this.isFirestoreAvailable()) {
        const downloadRef = doc(firestore, 'downloads', downloadId)
        await deleteDoc(downloadRef)
      }
    } catch (error) {
      console.error('Error deleting download:', error)
    }
  }

  /**
   * Delete all downloads for this device
   */
  async deleteAllDownloads() {
    try {
      // Clear localStorage
      localStorage.setItem(STORAGE_KEY_DOWNLOAD_LIST, JSON.stringify([]))

      // Delete from Firestore if online
      if (await this.isFirestoreAvailable()) {
        const downloadsRef = collection(firestore, 'downloads')
        const q = query(downloadsRef, where('deviceId', '==', this.deviceId))
        const querySnapshot = await getDocs(q)
        
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
      }
    } catch (error) {
      console.error('Error deleting all downloads:', error)
    }
  }

  /**
   * Track a download event
   */
  async trackDownloadEvent(eventType, downloadId, metadata = {}) {
    try {
      if (!(await this.isFirestoreAvailable())) {
        return // Skip if offline
      }

      const eventData = {
        eventType, // 'started', 'completed', 'failed', 'paused', 'resumed', 'progress'
        downloadId,
        deviceId: this.deviceId,
        timestamp: serverTimestamp(),
        ...metadata
      }

      await addDoc(collection(firestore, 'downloadEvents'), eventData)
    } catch (error) {
      console.error('Error tracking download event:', error)
      // Don't throw - event tracking shouldn't break the app
    }
  }

  /**
   * Get user preferences from Firestore
   */
  async getUserPreferences() {
    try {
      if (!(await this.isFirestoreAvailable())) {
        // Fallback to localStorage
        const prefs = localStorage.getItem('userPreferences')
        return prefs ? JSON.parse(prefs) : null
      }

      const prefsRef = doc(firestore, 'userPreferences', this.deviceId)
      const prefsSnap = await getDoc(prefsRef)
      
      if (prefsSnap.exists()) {
        const data = prefsSnap.data()
        // Also save to localStorage for offline access
        localStorage.setItem('userPreferences', JSON.stringify(data))
        return data
      }
      
      return null
    } catch (error) {
      console.error('Error getting user preferences:', error)
      const prefs = localStorage.getItem('userPreferences')
      return prefs ? JSON.parse(prefs) : null
    }
  }

  /**
   * Save user preferences to Firestore
   */
  async saveUserPreferences(preferences) {
    try {
      // Always save to localStorage first
      localStorage.setItem('userPreferences', JSON.stringify(preferences))

      // Save to Firestore if online
      if (await this.isFirestoreAvailable()) {
        const prefsRef = doc(firestore, 'userPreferences', this.deviceId)
        await setDoc(prefsRef, {
          ...preferences,
          deviceId: this.deviceId,
          updatedAt: serverTimestamp()
        }, { merge: true })
      }
    } catch (error) {
      console.error('Error saving user preferences:', error)
    }
  }

  /**
   * Sync localStorage data to Firestore (for when connection is restored)
   */
  async syncLocalStorageToFirestore() {
    if (this.syncInProgress || !this.isOnline) {
      return
    }

    try {
      this.syncInProgress = true
      
      if (!(await this.isFirestoreAvailable())) {
        return
      }

      // Note: We no longer sync full download history to Firestore 
      // to reduce database burden and cost.
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, Date.now().toString())
      console.log('✅ Sync check completed')
    } catch (error) {
      console.error('Error syncing to Firestore:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Initialize Firestore service
   */
  async initialize() {
    try {
      // Test connection
      const isAvailable = await this.isFirestoreAvailable()
      if (isAvailable) {
        // Sync any pending data
        await this.syncLocalStorageToFirestore()
        console.log('✅ Firestore service initialized')
      } else {
        console.log('⚠️ Firestore not available, using localStorage only')
      }
      return isAvailable
    } catch (error) {
      console.error('Error initializing Firestore service:', error)
      return false
    }
  }
  /**
   * Save download error to Firestore
   */
  async saveDownloadError(downloadData, errorMessage) {
    try {
      if (await this.isFirestoreAvailable()) {
        try {
          // Create a new document in 'download_errors' collection
          // We use addDoc to let Firestore generate the ID, or we could use the download ID if valid
          await addDoc(collection(firestore, 'download_errors'), {
            downloadId: downloadData.id || 'unknown',
            title: downloadData.title || 'Unknown',
            url: downloadData.url || '',
            error: errorMessage,
            deviceId: this.deviceId,
            timestamp: serverTimestamp(),
            occurredAt: new Date().toISOString(),
            platform: downloadData.platform || 'Unknown',
            downloadType: downloadData.downloadType || 'Unknown'
          })
          console.log('Error logged to Firestore')
        } catch (firestoreError) {
          console.error('Failed to log error to Firestore:', firestoreError)
        }
      }
    } catch (error) {
      console.error('Error in saveDownloadError:', error)
    }
  }

  /**
   * Save user feedback to Firestore
   */
  async saveFeedback(feedbackData) {
    try {
      if (await this.isFirestoreAvailable()) {
        try {
          await addDoc(collection(firestore, 'feedback'), {
            ...feedbackData,
            deviceId: this.deviceId,
            timestamp: serverTimestamp(),
            platform: navigator.platform,
            appVersion: '1.0.46'
          })
          console.log('Feedback saved to Firestore')
        } catch (firestoreError) {
          console.error('Failed to save feedback to Firestore:', firestoreError)
          throw firestoreError
        }
      } else {
        console.warn('Firestore not available, cannot save feedback')
        throw new Error('Firestore not available')
      }
    } catch (error) {
      console.error('Error in saveFeedback:', error)
      throw error
    }
  }

  /**
   * Clear all documents from the legacy 'downloads' collection
   * WARNING: This deletes data for ALL users in that collection
   */
  async clearLegacyDownloads() {
    try {
      if (!(await this.isFirestoreAvailable())) return;
      
      const downloadsRef = collection(firestore, 'downloads')
      const querySnapshot = await getDocs(query(downloadsRef, limit(500))) // Process in batches to avoid timeout
      
      if (querySnapshot.empty) {
        console.log('No legacy downloads to clear.')
        return
      }

      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      
      console.log(`Successfully cleared ${querySnapshot.size} legacy documents.`)
      
      // If there's more, the user can run this again or we could recurse, 
      // but a small batch is safer for a one-off UI trigger.
      if (querySnapshot.size === 500) {
        console.warn('There might be more records. Run cleanup again if needed.')
      }
    } catch (error) {
      console.error('Error clearing legacy downloads:', error)
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService()

// Export convenience functions
export const getDownloads = () => firestoreService.getDownloads()
export const saveDownload = (downloadData) => firestoreService.saveDownload(downloadData)
export const deleteDownload = (downloadId) => firestoreService.deleteDownload(downloadId)
export const deleteAllDownloads = () => firestoreService.deleteAllDownloads()
export const trackDownloadEvent = (eventType, downloadId, metadata) => 
  firestoreService.trackDownloadEvent(eventType, downloadId, metadata)
export const getUserPreferences = () => firestoreService.getUserPreferences()
export const saveUserPreferences = (preferences) => firestoreService.saveUserPreferences(preferences)
export const initializeFirestore = () => firestoreService.initialize()
export const syncToFirestore = () => firestoreService.syncLocalStorageToFirestore()
export const saveDownloadError = (downloadData, errorMessage) => firestoreService.saveDownloadError(downloadData, errorMessage)
export const saveFeedback = (feedbackData) => firestoreService.saveFeedback(feedbackData)
export const clearLegacyDownloads = () => firestoreService.clearLegacyDownloads()
