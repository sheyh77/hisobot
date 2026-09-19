import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { db } from "../lib/firebase";

const usersRef = collection(db, "users");
const transactionsRef = collection(db, "transactions");
const categoriesRef = collection(db, "categories");
const notificationsRef = collection(db, "notifications");
const paymentMethodsRef = collection(db, "paymentMethods");
const paymentRequestsRef = collection(db, "paymentRequests");

const withId = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

export const getUserProfile = async (userId) => {
  const snapshot = await getDoc(doc(db, "users", userId));
  return snapshot.exists() ? withId(snapshot) : null;
};

export const saveUserProfile = (userId, values) => setDoc(doc(db, "users", userId), values, { merge: true });

export const getUserTransactions = async (userId) => {
  const snapshot = await getDocs(query(transactionsRef, where("userId", "==", userId)));
  return snapshot.docs.map(withId).sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
};

export const getAllTransactions = async () => {
  const snapshot = await getDocs(transactionsRef);
  return snapshot.docs.map(withId);
};

export const createTransaction = async (values) => withId(await addDoc(transactionsRef, values));

export const updateTransaction = (transactionId, values) => updateDoc(doc(db, "transactions", transactionId), values);

export const getAllUsers = async () => {
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(withId);
};

export const getCategories = async () => {
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map(withId);
};

export const createCategory = async (values) => withId(await addDoc(categoriesRef, values));

export const removeCategory = (categoryId) => deleteDoc(doc(db, "categories", categoryId));

export const createNotification = async (values) => withId(await addDoc(notificationsRef, values));

export const getUserNotifications = async (userId) => {
  const [allSnapshot, ownSnapshot] = await Promise.all([
    getDocs(query(notificationsRef, where("audience", "==", "all"))),
    getDocs(query(notificationsRef, where("audience", "==", userId))),
  ]);
  const items = [...allSnapshot.docs, ...ownSnapshot.docs].map(withId);
  return [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getPaymentMethods = async () => (await getDocs(paymentMethodsRef)).docs.map(withId);
export const createPaymentMethod = async (values) => withId(await addDoc(paymentMethodsRef, values));
export const removePaymentMethod = (methodId) => deleteDoc(doc(db, "paymentMethods", methodId));
export const getPaymentRequests = async (userId) => {
  const snapshot = await getDocs(userId ? query(paymentRequestsRef, where("userId", "==", userId)) : paymentRequestsRef);
  return snapshot.docs.map(withId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
export const createPaymentRequest = async (values) => withId(await addDoc(paymentRequestsRef, values));
export const updatePaymentRequest = (requestId, values) => updateDoc(doc(db, "paymentRequests", requestId), values);
export const uploadPaymentReceipt = async (userId, file) => {
  const storage = getStorage();
  const fileRef = ref(storage, `payment-receipts/${userId}/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};
