// Simple dashboard script - uses Firebase Web SDK (modular)
// This file fetches the total count of documents in `download_errors` and lists the latest entries.

// We'll dynamically import Firebase modules so the dashboard still works in local-only mode
let initializeApp, getFirestore, collection, getDocs, query, orderBy, limit, startAfter, documentId
let firestore = null
let FIREBASE_LOADED = false

// Try to load Firebase modules from CDN. If this fails, the dashboard will still run in local-only mode.
(async function tryLoadFirebase() {
  try {
    const appModule = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js')
    const fsModule = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js')
    initializeApp = appModule.initializeApp
    getFirestore = fsModule.getFirestore
    collection = fsModule.collection
    getDocs = fsModule.getDocs
    query = fsModule.query
    orderBy = fsModule.orderBy
    limit = fsModule.limit
    startAfter = fsModule.startAfter
    documentId = fsModule.documentId

    // Initialize app and firestore
    const firebaseConfig = {
      apiKey: 'AIzaSyDCYjdizAEF-orEmVl7uZkyeq2RzPAfbTE',
      authDomain: 'pnut-windows.firebaseapp.com',
      databaseURL: 'https://pnut-windows-default-rtdb.asia-southeast1.firebasedatabase.app',
      projectId: 'pnut-windows',
      storageBucket: 'pnut-windows.firebasestorage.app',
      messagingSenderId: '862257784794',
      appId: '1:862257784794:web:444043c555a6ef8a5742e3'
    }
    try {
      const app = initializeApp(firebaseConfig)
      firestore = getFirestore(app)
      FIREBASE_LOADED = true
      console.log('✅ Firebase modules loaded')
    } catch (e) {
      console.warn('Firebase init failed:', e)
      FIREBASE_LOADED = false
    }
  } catch (err) {
    console.warn('Could not load Firebase SDK from CDN, running in local-only mode.', err)
    FIREBASE_LOADED = false
  }
})()

// Note: Firebase is loaded dynamically above. If it fails, the script will continue in local-only mode.

const errorCountEl = document.getElementById('errorCount')
const errorsBody = document.getElementById('errorsBody')
const errorsTable = document.getElementById('errorsTable')
const loadingEl = document.getElementById('loading')
const lastSyncEl = document.getElementById('lastSync')
const userCountEl = document.getElementById('userCount')
const usersBody = document.getElementById('usersBody')
const usersTable = document.getElementById('usersTable')
const usersLoadingEl = document.getElementById('usersLoading')
const usersLastCheckEl = document.getElementById('usersLastCheck')
const usersListSection = document.getElementById('usersListSection')
const usersSection = document.getElementById('usersSection')
const usersWithDownloadsCountEl = document.getElementById('usersWithDownloadsCount')
const downloadsCountEl = document.getElementById('downloadsCount')
const downloadsBody = document.getElementById('downloadsBody')
const downloadsTable = document.getElementById('downloadsTable')
const downloadsLoadingEl = document.getElementById('downloadsLoading')
const downloadsLastCheckEl = document.getElementById('downloadsLastCheck')
const downloadsListSection = document.getElementById('downloadsListSection')
const downloadsSection = document.getElementById('downloadsSection')
const errorsListSection = document.getElementById('errorsListSection')
const loadMoreErrorsBtn = document.getElementById('loadMoreErrorsBtn')
const loadMoreDownloadsBtn = document.getElementById('loadMoreDownloadsBtn')
const loadMoreUsersBtn = document.getElementById('loadMoreUsersBtn')
// Local add controls
const addLocalErrorBtn = document.getElementById('addLocalErrorBtn')
const localErrorTitle = document.getElementById('localErrorTitle')
const localErrorUrl = document.getElementById('localErrorUrl')
const localErrorPlatform = document.getElementById('localErrorPlatform')
const localErrorMsg = document.getElementById('localErrorMsg')

const addLocalUserBtn = document.getElementById('addLocalUserBtn')
const localUserId = document.getElementById('localUserId')
const localUserName = document.getElementById('localUserName')

// localStorage keys
const LOCAL_ERRORS_KEY = 'db_dashboard_local_errors'
const LOCAL_USERS_KEY = 'db_dashboard_local_users'

// Pagination state
let errorsLastDoc = null
let downloadsLastDoc = null
let usersLastDoc = null
const ERRORS_PAGE_SIZE = 25
const DOWNLOADS_PAGE_SIZE = 25
const USERS_PAGE_SIZE = 25

// Fetch paginated errors (append = false will reset list)
async function fetchErrorsRecent(pageSize = ERRORS_PAGE_SIZE, append = false) {
  try {
    if (!FIREBASE_LOADED) {
      loadingEl.textContent = 'Firestore not available — showing local entries only.'
      loadingEl.classList.remove('hidden')
      errorsTable.classList.add('hidden')
      return
    }
    const errorsRef = collection(firestore, 'download_errors')

    // Build query: try ordering by timestamp, fallback to documentId
    let q
    try {
      q = query(errorsRef, orderBy('timestamp', 'desc'), limit(pageSize))
      if (append && errorsLastDoc) q = query(errorsRef, orderBy('timestamp', 'desc'), startAfter(errorsLastDoc), limit(pageSize))
    } catch (e) {
      q = query(errorsRef, orderBy(documentId(), 'desc'), limit(pageSize))
      if (append && errorsLastDoc) q = query(errorsRef, orderBy(documentId(), 'desc'), startAfter(errorsLastDoc), limit(pageSize))
    }

    const snapshot = await getDocs(q)

    // Update total count (simple get, ok for small datasets)
    const allSnapshot = await getDocs(errorsRef)
    errorCountEl.textContent = allSnapshot.size

    // Render rows
    if (!append) errorsBody.innerHTML = ''
    snapshot.forEach(doc => {
      const d = doc.data()
      const timestamp = d.timestamp?.toDate?.()?.toLocaleString() || d.occurredAt || '—'
      const title = d.title || d.downloadId || 'Unknown'
      const url = d.url || d.sourceUrl || ''
      const error = d.error || 'No message'
      const platform = d.platform || 'Unknown'

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${escapeHtml(timestamp)}</td>
        <td>${escapeHtml(title)}</td>
        <td>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">link</a>` : '—'}</td>
        <td>${escapeHtml(error)}</td>
        <td>${escapeHtml(platform)}</td>
      `
      errorsBody.appendChild(tr)
    })

    // Keep reference to last doc for pagination
    if (snapshot.docs.length > 0) {
      errorsLastDoc = snapshot.docs[snapshot.docs.length - 1]
      loadMoreErrorsBtn.disabled = snapshot.docs.length < pageSize
    } else {
      // no more
      loadMoreErrorsBtn.disabled = true
    }

    loadingEl.classList.add('hidden')
    errorsTable.classList.remove('hidden')
    lastSyncEl.textContent = new Date().toLocaleString()
  } catch (err) {
    console.error('Error loading errors:', err)
    loadingEl.textContent = 'Failed to load data. Check console for details (permissions, network).'
  }
}

// --- Downloads fetching and rendering ---
async function fetchDownloadsRecent() {
  try {
    if (!FIREBASE_LOADED) {
      downloadsLoadingEl.textContent = 'Firestore not available — showing local entries only.'
      downloadsLoadingEl.classList.remove('hidden')
      downloadsTable.classList.add('hidden')
      return
    }
    const downloadsRef = collection(firestore, 'downloads')
    // Paginated downloads
    let q
    try {
      q = query(downloadsRef, orderBy('downloadDate', 'desc'), limit(DOWNLOADS_PAGE_SIZE))
      if (downloadsLastDoc) q = query(downloadsRef, orderBy('downloadDate', 'desc'), startAfter(downloadsLastDoc), limit(DOWNLOADS_PAGE_SIZE))
    } catch (e) {
      // fallback to documentId ordering
      q = query(downloadsRef, orderBy(documentId(), 'desc'), limit(DOWNLOADS_PAGE_SIZE))
      if (downloadsLastDoc) q = query(downloadsRef, orderBy(documentId(), 'desc'), startAfter(downloadsLastDoc), limit(DOWNLOADS_PAGE_SIZE))
    }

    const snapshot = await getDocs(q)

    // total downloads (simple approach)
    const allSnapshot = await getDocs(downloadsRef)
    downloadsCountEl.textContent = allSnapshot.size

    // Render recent downloads (append)
    if (!downloadsLastDoc) downloadsBody.innerHTML = ''
    snapshot.forEach(doc => {
      const d = doc.data()
      const timestamp = d.downloadDate?.toDate?.()?.toLocaleString() || d.createdAt?.toDate?.()?.toLocaleString() || d.uploadedAt || d.occurredAt || '—'
      const title = d.title || d.downloadId || 'Unknown'
      const url = d.url || d.sourceUrl || ''
      const device = d.deviceId || '—'
      const status = d.status || d.state || '—'

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${escapeHtml(timestamp)}</td>
        <td>${escapeHtml(title)}</td>
        <td>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">link</a>` : '—'}</td>
        <td>${escapeHtml(device)}</td>
        <td>${escapeHtml(status)}</td>
      `
      downloadsBody.appendChild(tr)
    })

    if (snapshot.docs.length > 0) {
      downloadsLastDoc = snapshot.docs[snapshot.docs.length - 1]
      loadMoreDownloadsBtn.disabled = snapshot.docs.length < DOWNLOADS_PAGE_SIZE
    } else {
      loadMoreDownloadsBtn.disabled = true
    }

    downloadsLoadingEl.classList.add('hidden')
    downloadsTable.classList.remove('hidden')
    downloadsLastCheckEl.textContent = new Date().toLocaleString()
  } catch (err) {
    console.error('Error loading downloads:', err)
    downloadsLoadingEl.textContent = 'Failed to load downloads. Check console.'
  }
}

// Basic HTML-escape for safety
function escapeHtml(s){
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// --- Local storage helpers for offline/manual entries ---
function loadLocalErrors() {
  try {
    const raw = localStorage.getItem(LOCAL_ERRORS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) { return [] }
}

function saveLocalError(entry) {
  const arr = loadLocalErrors()
  arr.unshift(entry)
  localStorage.setItem(LOCAL_ERRORS_KEY, JSON.stringify(arr))
}

function loadLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) { return [] }
}

function saveLocalUser(entry) {
  const arr = loadLocalUsers()
  arr.unshift(entry)
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(arr))
}

function renderLocalErrorsIntoTable() {
  const local = loadLocalErrors()
  local.forEach(d => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${escapeHtml(d.timestamp)}</td>
      <td>${escapeHtml(d.title)}</td>
      <td>${d.url ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">link</a>` : '—'}</td>
      <td>${escapeHtml(d.error)}</td>
      <td>${escapeHtml(d.platform || 'Local')}</td>
    `
    errorsBody.insertBefore(tr, errorsBody.firstChild)
  })
}

function renderLocalUsersIntoTable() {
  const local = loadLocalUsers()
  local.forEach(u => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${escapeHtml(u.id)}</td>
      <td>${escapeHtml(u.name || '')}</td>
      <td><pre>${escapeHtml(JSON.stringify(u.meta || {}))}</pre></td>
    `
    usersBody.insertBefore(tr, usersBody.firstChild)
  })
}

// Kick off
// Render any local entries first so user can see data even with Firestore blocked
renderLocalErrorsIntoTable()
renderLocalUsersIntoTable()

// Kick off Firestore-backed fetch (paginated)
fetchErrorsRecent()

// --- Users fetching and rendering ---
async function fetchUsersRecent() {
  try {
    if (!FIREBASE_LOADED) {
      usersLoadingEl.textContent = 'Firestore not available — showing local entries only.'
      usersLoadingEl.classList.remove('hidden')
      usersTable.classList.add('hidden')
      return
    }
    const usersRef = collection(firestore, 'users')

    // Paginated users: try ordering by createdAt or fallback to documentId
    let q
    try {
      q = query(usersRef, orderBy('createdAt', 'desc'), limit(USERS_PAGE_SIZE))
      if (usersLastDoc) q = query(usersRef, orderBy('createdAt', 'desc'), startAfter(usersLastDoc), limit(USERS_PAGE_SIZE))
    } catch (e) {
      q = query(usersRef, orderBy(documentId(), 'desc'), limit(USERS_PAGE_SIZE))
      if (usersLastDoc) q = query(usersRef, orderBy(documentId(), 'desc'), startAfter(usersLastDoc), limit(USERS_PAGE_SIZE))
    }

    const snapshot = await getDocs(q)

    // total user count (simple approach)
    const allSnapshot = await getDocs(usersRef)
    userCountEl.textContent = allSnapshot.size

    // Render users (append if paginating)
    if (!usersLastDoc) usersBody.innerHTML = ''
    snapshot.docs.forEach(doc => {
      const d = doc.data()
      const id = doc.id
      const nameOrEmail = d.email || d.displayName || d.name || ''
      const meta = { ...d }
      delete meta.email
      delete meta.displayName
      delete meta.name

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(nameOrEmail)}</td>
        <td><pre>${escapeHtml(JSON.stringify(meta, null, 0))}</pre></td>
      `
      usersBody.appendChild(tr)
    })

    if (snapshot.docs.length > 0) {
      usersLastDoc = snapshot.docs[snapshot.docs.length - 1]
      loadMoreUsersBtn.disabled = snapshot.docs.length < USERS_PAGE_SIZE
    } else {
      loadMoreUsersBtn.disabled = true
    }

    usersLoadingEl.classList.add('hidden')
    usersTable.classList.remove('hidden')
    usersLastCheckEl.textContent = new Date().toLocaleString()
    // Also compute how many distinct users/devices have downloads
    computeUsersWithDownloads()
  } catch (err) {
    console.error('Error loading users:', err)
    usersLoadingEl.textContent = 'Failed to load users. Check console.'
  }
}

// Compute number of distinct users/devices that have at least one download
async function computeUsersWithDownloads() {
  try {
    const downloadsRef = collection(firestore, 'downloads')
    // For small/medium projects we can fetch all docs; for larger sets, consider aggregation.
    const snapshot = await getDocs(downloadsRef)
    const deviceIdSet = new Set()
    snapshot.forEach(doc => {
      const d = doc.data()
      if (d.deviceId) deviceIdSet.add(d.deviceId)
    })

    usersWithDownloadsCountEl.textContent = deviceIdSet.size
  } catch (err) {
    console.error('Error computing users with downloads:', err)
    usersWithDownloadsCountEl.textContent = '—'
  }
}

// Toggle tabs
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')

    // Errors
    document.getElementById('errorsSection').classList.toggle('hidden', btn.dataset.target !== 'errorsSection')
    errorsListSection.classList.toggle('hidden', btn.dataset.target !== 'errorsSection')

    // Downloads
    downloadsSection.classList.toggle('hidden', btn.dataset.target !== 'downloadsSection')
    downloadsListSection.classList.toggle('hidden', btn.dataset.target !== 'downloadsSection')

    // Users
    usersSection.classList.toggle('hidden', btn.dataset.target !== 'usersSection')
    usersListSection.classList.toggle('hidden', btn.dataset.target !== 'usersSection')

    if (btn.dataset.target === 'usersSection') {
      // reset pagination state for users
      usersLastDoc = null
      loadMoreUsersBtn.disabled = false
      fetchUsersRecent()
    } else if (btn.dataset.target === 'downloadsSection') {
      // reset pagination state for downloads
      downloadsLastDoc = null
      loadMoreDownloadsBtn.disabled = false
      fetchDownloadsRecent()
    } else if (btn.dataset.target === 'errorsSection') {
      // reset pagination state for errors
      errorsLastDoc = null
      loadMoreErrorsBtn.disabled = false
      fetchErrorsRecent()
    }
  })
})

// Refresh errors periodically (already set); users refresh on-demand when tab shown

// Optionally refresh every minute (refresh first page of errors)
setInterval(() => fetchErrorsRecent(), 60_000)

// Wire up load more buttons
loadMoreErrorsBtn?.addEventListener('click', () => {
  fetchErrorsRecent(ERRORS_PAGE_SIZE, true)
})

loadMoreDownloadsBtn?.addEventListener('click', () => {
  fetchDownloadsRecent()
})

loadMoreUsersBtn?.addEventListener('click', () => {
  fetchUsersRecent()
})

// Initial load - errors first page
fetchErrorsRecent()

// Wire up local add buttons
addLocalErrorBtn?.addEventListener('click', () => {
  const title = (localErrorTitle.value || '').trim()
  const url = (localErrorUrl.value || '').trim()
  const platform = (localErrorPlatform.value || '').trim()
  const errorMsg = (localErrorMsg.value || '').trim()
  if (!title && !errorMsg) return
  const entry = {
    title: title || 'Local entry',
    url,
    platform: platform || 'Local',
    error: errorMsg || '—',
    timestamp: new Date().toLocaleString()
  }
  saveLocalError(entry)
  // show immediately
  const tr = document.createElement('tr')
  tr.innerHTML = `
    <td>${escapeHtml(entry.timestamp)}</td>
    <td>${escapeHtml(entry.title)}</td>
    <td>${entry.url ? `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener">link</a>` : '—'}</td>
    <td>${escapeHtml(entry.error)}</td>
    <td>${escapeHtml(entry.platform)}</td>
  `
  errorsBody.insertBefore(tr, errorsBody.firstChild)
  // clear inputs
  localErrorTitle.value = ''
  localErrorUrl.value = ''
  localErrorPlatform.value = ''
  localErrorMsg.value = ''
})

addLocalUserBtn?.addEventListener('click', () => {
  const id = (localUserId.value || '').trim()
  const name = (localUserName.value || '').trim()
  if (!id) return
  const entry = { id, name, meta: { local: true }, addedAt: new Date().toLocaleString() }
  saveLocalUser(entry)
  const tr = document.createElement('tr')
  tr.innerHTML = `
    <td>${escapeHtml(entry.id)}</td>
    <td>${escapeHtml(entry.name)}</td>
    <td><pre>${escapeHtml(JSON.stringify(entry.meta))}</pre></td>
  `
  usersBody.insertBefore(tr, usersBody.firstChild)
  localUserId.value = ''
  localUserName.value = ''
})
