import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDFW3_0a16yh12R9hqU0QCAiO3tIvGbnfg",
    authDomain: "amazing-construcoes.firebaseapp.com",
    projectId: "amazing-construcoes",
    storageBucket: "amazing-construcoes.firebasestorage.app",
    messagingSenderId: "471846500591",
    appId: "1:471846500591:web:7afe3d3539d3f11e3b431a",
    measurementId: "G-DRCZXS1EFG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
