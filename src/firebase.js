import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCI4T5LdusI6UeU_4Xv7FJsQuNBWxx5R90",
    authDomain: "noralapickleballsystem.firebaseapp.com",
    projectId: "noralapickleballsystem",
    storageBucket: "noralapickleballsystem.firebasestorage.app",
    messagingSenderId: "163611680960",
    appId: "1:163611680960:web:688d525e8c5f0486700d25",
    measurementId: "G-GTRJP8P3E9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
let db;
try {
    db = initializeFirestore(app, { localCache: persistentLocalCache() });
} catch {
    db = getFirestore(app);
}
export { db };
export default app;