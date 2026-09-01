import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'admin' | 'employee' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  department?: string;
  createdAt?: any;
  updatedAt?: any;
  isActive?: boolean;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
};

export const createUserProfile = async (profile: UserProfile) => {
  const docRef = doc(db, 'users', profile.uid);
  await setDoc(docRef, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, 'users'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as UserProfile);
};
