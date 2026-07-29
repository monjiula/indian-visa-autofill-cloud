// storage.js
// Abstraction layer for Firestore and Local Storage

export async function getProfiles() {
    if (!window.auth || !window.auth.currentUser) return {};

    const profiles = {};
    const uid = window.auth.currentUser.uid;
    const snapshot = await window.db.collection('users').doc(uid).collection('profiles').get();
    
    snapshot.forEach(doc => {
        profiles[doc.id] = doc.data();
    });
    
    // Sync to local storage so content.js can access them
    await chrome.storage.local.set(profiles);
    
    return profiles;
}

export async function saveProfile(key, data) {
    if (!window.auth || !window.auth.currentUser) return;
    const uid = window.auth.currentUser.uid;
    await window.db.collection('users').doc(uid).collection('profiles').doc(key).set(data);
    await chrome.storage.local.set({ [key]: data });
}

export async function deleteProfile(key) {
    if (!window.auth || !window.auth.currentUser) return;
    const uid = window.auth.currentUser.uid;
    await window.db.collection('users').doc(uid).collection('profiles').doc(key).delete();
    await chrome.storage.local.remove(key);
}

export async function getAllUsersProfiles() {
    if (!window.auth || !window.auth.currentUser) return {};
    // Only works if admin
    const profiles = {};
    const snapshot = await window.db.collectionGroup('profiles').get();
    snapshot.forEach(doc => {
        profiles[doc.id] = { ...doc.data(), _fullPath: doc.ref.path };
    });
    return profiles;
}

export async function adminDeleteProfile(fullPath) {
    if (!window.auth || !window.auth.currentUser) return;
    await window.db.doc(fullPath).delete();
}
