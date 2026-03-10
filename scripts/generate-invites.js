import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to generate a random code
function generateCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `NEXUS-${result}`;
}

// Function to save a new valid invite code to Firestore
async function createInviteCode() {
    const code = generateCode();
    try {
        await setDoc(doc(db, 'invites', code), {
            valid: true,
            createdAt: new Date().toISOString(),
            usedBy: null,
            usedAt: null
        });
        console.log(`✅ Sucesso! Código de convite criado: ${code}`);
    } catch (error) {
        console.error('Erro ao criar código:', error);
    }
}

// Generate 5 codes
async function run() {
    for (let i = 0; i < 5; i++) {
        await createInviteCode();
    }
    console.log("Concluído.");
    process.exit(0);
}

run();
