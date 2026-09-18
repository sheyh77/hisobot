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
import { db } from "../lib/firebase";

const usersRef = collection(db, "users");
const transactionsRef = collection(db, "transactions");
const categoriesRef = collection(db, "categories");
const notificationsRef = collection(db, "notifications");

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
