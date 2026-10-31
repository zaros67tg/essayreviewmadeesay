import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY || "AIzaSyDummyKeyForDevelopment",
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN || "essay-grader.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID || "essay-grader",
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const db = getFirestore(app);
