import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDCYjdizAEF-orEmVl7uZkyeq2RzPAfbTE',
  authDomain: 'pnut-windows.firebaseapp.com',
  databaseURL: 'https://pnut-windows-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pnut-windows',
  storageBucket: 'pnut-windows.firebasestorage.app',
  messagingSenderId: '862257784794',
  appId: '1:862257784794:web:444043c555a6ef8a5742e3'
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Realtime Database (existing)
export const db = getDatabase(app)

// Initialize Firestore Database
export const firestore = getFirestore(app)
