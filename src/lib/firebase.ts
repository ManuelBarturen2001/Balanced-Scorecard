// Importa las funciones que necesitas de los SDKs que necesitas
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// La configuración de Firebase de tu aplicación web
const firebaseConfig = {
  apiKey: "AIzaSyB5cPC2-mbUOTAIptWXvuFEvhNB9KlRH2I",
  authDomain: "cmi-unmsm.firebaseapp.com",
  databaseURL: "https://cmi-unmsm-default-rtdb.firebaseio.com",
  projectId: "cmi-unmsm",
  storageBucket: "cmi-unmsm.firebasestorage.app",
  messagingSenderId: "13916791713",
  appId: "1:13916791713:web:6febba791c9213eba2e1e0",
  measurementId: "G-7D0LJFE1PX"
};

// Inicializa Firebase
// Comprueba si ya existe una instancia para evitar errores de inicialización múltiple
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
let analytics;

// Inicializa Analytics solo en el lado del cliente y si hay un measurementId
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
}

export { app, auth, firestore, storage, analytics };
