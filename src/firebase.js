import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs,
  getDoc, doc, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const authApi = {
  observe(callback) { return onAuthStateChanged(auth, callback); },
  login(email, password) { return signInWithEmailAndPassword(auth, email, password); },
  resetPassword(email) { return sendPasswordResetEmail(auth, email); },
  logout() { return signOut(auth); }
};

export async function getCurrentUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/*
  Analytics repository.
  The UI is intentionally independent from Firestore document shape.
  Add/modify repository methods here as the data model grows.
*/
export const analyticsRepo = {
  async getMonthlySummary({ year, month, managerId = null } = {}) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const ref = doc(db, "analyticsMonthly", key);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (managerId && data.managerId && data.managerId !== managerId) return null;
    return { id: snap.id, ...data };
  },

  async getEmployees({ activeOnly = true } = {}) {
    const base = collection(db, "employees");
    const q = activeOnly
      ? query(base, where("active", "==", true), orderBy("name"))
      : query(base, orderBy("name"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getProcesses() {
    const snap = await getDocs(query(collection(db, "processes"), orderBy("sortOrder")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getProcessMonthly(processId, year, month) {
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const q = query(
      collection(db, "processMetrics"),
      where("processId", "==", processId),
      where("period", "==", period),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  async getEmployeeMonthly(employeeId, year, month) {
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const q = query(
      collection(db, "employeeMetrics"),
      where("employeeId", "==", employeeId),
      where("period", "==", period),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  }
};

export { serverTimestamp, Timestamp };
