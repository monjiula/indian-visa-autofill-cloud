// firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSyC8caCqfT1u3dc4qxyyAZIMD7FJn3fPru8",
    authDomain: "iv-autofill-cloud.firebaseapp.com",
    projectId: "iv-autofill-cloud",
    storageBucket: "iv-autofill-cloud.firebasestorage.app",
    messagingSenderId: "592682456237",
    appId: "1:592682456237:web:c8b67d4d34fa0fc43be224",
    measurementId: "G-YJVWS5YMJX"
};

// Initialize Firebase using the Compat libraries
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Export them for use in module scripts (if needed) or just attach to window
window.db = db;
window.auth = auth;
