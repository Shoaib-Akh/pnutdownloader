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
  Timestamp
} from 'firebase/firestore'
import { firestore } from '../firebase'

/**
 * Firestore utility functions for common database operations
 */

/**
 * Add a document to a collection
 * @param {string} collectionName - Name of the collection
 * @param {object} data - Data to add
 * @param {string} docId - Optional document ID (if not provided, Firestore will auto-generate)
 * @returns {Promise<string>} Document ID
 */
export const addDocument = async (collectionName, data, docId = null) => {
  try {
    if (docId) {
      // Use setDoc to create with specific ID
      await setDoc(doc(firestore, collectionName, docId), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docId
    } else {
      // Use addDoc to auto-generate ID
      const docRef = await addDoc(collection(firestore, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    }
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error)
    throw error
  }
}

/**
 * Get a document by ID
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @returns {Promise<object|null>} Document data or null if not found
 */
export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(firestore, collectionName, docId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    } else {
      return null
    }
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error)
    throw error
  }
}

/**
 * Get all documents from a collection
 * @param {string} collectionName - Name of the collection
 * @param {object} options - Query options (where, orderBy, limit)
 * @returns {Promise<Array>} Array of documents
 */
export const getDocuments = async (collectionName, options = {}) => {
  try {
    let q = collection(firestore, collectionName)
    
    // Apply where clauses
    if (options.where && Array.isArray(options.where)) {
      options.where.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value))
      })
    }
    
    // Apply orderBy
    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'))
    }
    
    // Apply limit
    if (options.limit) {
      q = query(q, limit(options.limit))
    }
    
    const querySnapshot = await getDocs(q)
    const documents = []
    
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() })
    })
    
    return documents
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error)
    throw error
  }
}

/**
 * Update a document
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @param {object} data - Data to update
 * @returns {Promise<void>}
 */
export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(firestore, collectionName, docId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error)
    throw error
  }
}

/**
 * Delete a document
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @returns {Promise<void>}
 */
export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(firestore, collectionName, docId))
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error)
    throw error
  }
}

/**
 * Initialize user tracking in Firestore
 * Similar to the Realtime Database version but for Firestore
 */
export const initializeUserTrackingFirestore = async (deviceId) => {
  try {
    const userRef = doc(firestore, 'users', deviceId)
    
    const deviceInfo = {
      deviceId,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      lastActive: serverTimestamp(),
      appVersion: '1.0.46',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      online: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    // Use setDoc with merge to create or update
    await setDoc(userRef, deviceInfo, { merge: true })
    
    console.log('User tracking initialized in Firestore for device:', deviceId)
    return deviceId
  } catch (error) {
    // Silently handle permissions error - app will work with localStorage
    if (error.code === 'permission-denied' || error.code === 'permissions-denied' || error.message?.includes('permission') || error.message?.includes('Permission')) {
      // Don't log error, just return null - app will work with localStorage
      return null
    }
    // Only log non-permission errors
    if (error.code !== 'permission-denied' && error.code !== 'permissions-denied') {
      console.error('Failed to initialize user tracking in Firestore:', error)
    }
    return null
  }
}

/**
 * Example: Track download events
 */
export const trackDownloadEvent = async (eventData) => {
  try {
    const downloadRef = await addDoc(collection(firestore, 'downloads'), {
      ...eventData,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    })
    return downloadRef.id
  } catch (error) {
    console.error('Error tracking download event:', error)
    throw error
  }
}

/**
 * Example: Get user's download history
 */
export const getUserDownloads = async (deviceId, limitCount = 50) => {
  try {
    const downloads = await getDocuments('downloads', {
      where: [{ field: 'deviceId', operator: '==', value: deviceId }],
      orderBy: { field: 'timestamp', direction: 'desc' },
      limit: limitCount
    })
    return downloads
  } catch (error) {
    console.error('Error getting user downloads:', error)
    throw error
  }
}

/**
 * Test Firestore connection by creating a test document
 * This can be called to verify Firestore is working properly
 */
export const testFirestoreConnection = async () => {
  try {
    const testDoc = await addDocument('_test', {
      message: 'Firestore connection test',
      timestamp: new Date().toISOString()
    })
    console.log('✅ Firestore connection successful! Test document ID:', testDoc)
    
    // Clean up test document after 5 seconds
    setTimeout(async () => {
      try {
        await deleteDocument('_test', testDoc)
        console.log('✅ Test document cleaned up')
      } catch (error) {
        console.error('Error cleaning up test document:', error)
      }
    }, 5000)
    
    return true
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error)
    return false
  }
}
