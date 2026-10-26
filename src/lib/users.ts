import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'super_admin' | 'admin' | 'sales_executive' | 'employee' | 'viewer';

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
    const data = snap.data() as UserProfile;
    const email = (data.email || '').toLowerCase();
    const name = (data.displayName || '').toLowerCase();

    const isBhawna = email.includes('bhawna') || name.includes('bhawna');
    const isAnshuman = email.includes('anshuman') || name.includes('anshuman');
    const isNidhi = email.includes('nidhi') || name.includes('nidhi');
    const isSuperAdmin = email === 'marketing.srkmodular@gmail.com' || email === 'rathoresangeeta217@gmail.com' || isBhawna || isAnshuman;
    const isAdmin = isSuperAdmin || email === 'nidhi@srkmodular.com' || isNidhi;

    if (isSuperAdmin && data.role !== 'super_admin') {
      data.role = 'super_admin';
      updateUserProfile(uid, { role: 'super_admin' }).catch(() => {});
    } else if (isAdmin && data.role !== 'admin' && data.role !== 'super_admin') {
      data.role = 'admin';
      updateUserProfile(uid, { role: 'admin' }).catch(() => {});
    }

    return data;
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
