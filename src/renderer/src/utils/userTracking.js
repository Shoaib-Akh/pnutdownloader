import { ref, update, serverTimestamp, onDisconnect } from 'firebase/database'
import { db } from '../firebase'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY_DEVICE_ID = 'pnut_device_id'

/**
 * Gets or creates a unique device ID for this installation
 * @returns {string} The device ID
 */
export const getDeviceId = () => {
  let deviceId = localStorage.getItem(STORAGE_KEY_DEVICE_ID)
  
  if (!deviceId) {
    deviceId = uuidv4()
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId)
  }
  
  return deviceId
}

/**
 * Initializes user tracking in Firebase Realtime Database
 * Creates/Updates a record at users/{deviceId}
 */
export const initializeUserTracking = async () => {
  try {
    const deviceId = getDeviceId()
    const userRef = ref(db, `users/${deviceId}`)
    
    // Get some basic device info
    const deviceInfo = {
      deviceId,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      lastActive: serverTimestamp(),
      appVersion: '1.0.46', // Ideally this comes from package.json or window.api
      screenResolution: `${window.screen.width}x${window.screen.height}`
    }

    // Update the user record
    await update(userRef, deviceInfo)

    // Set up presence system (optional, but good for "is online" status)
    // If you want to track online status:
    /*
    const connectedRef = ref(db, '.info/connected');
    const onlineRef = ref(db, `users/${deviceId}/online`);
    
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(onlineRef).set(false);
        set(onlineRef, true);
      }
    });
    */
    
    // For now, just setting presence to false on disconnect to track sessions
    const onlineRef = ref(db, `users/${deviceId}/online`)
    onDisconnect(onlineRef).set(false)
    update(userRef, { online: true })

    console.log('User tracking initialized for device:', deviceId)
    return deviceId
  } catch (error) {
    console.error('Failed to initialize user tracking:', error)
    return null
  }
}
