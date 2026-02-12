// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA635033ARrFxumANObsLFi1h3AfMNCwQI",
  authDomain: "envoi-fb546.firebaseapp.com",
  projectId: "envoi-fb546",
  storageBucket: "envoi-fb546.firebasestorage.app",
  messagingSenderId: "1006106652724",
  appId: "1:1006106652724:web:a0cdcb986d7c840e455a61",
  measurementId: "G-0DTNF6GBW9"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

// const analytics = getAnalytics(app);