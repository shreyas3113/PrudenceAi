import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDy7fz3i5qVNDgAaAj7E4RvGpjJbglixMA",
    authDomain: "prudenceai-4046f.firebaseapp.com",
    databaseURL: "https://prudenceai-4046f-default-rtdb.firebaseio.com",
    projectId: "prudenceai-4046f",
    storageBucket: "prudenceai-4046f.appspot.com",
    messagingSenderId: "896774332544",
    appId: "1:896774332544:web:eaf6d39a7d0a24e5cf0665"
};

console.log('✅ Initializing Firebase with real configuration');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { app, auth, database }; 