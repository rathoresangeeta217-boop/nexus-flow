import { collection, addDoc, updateDoc, doc, onSnapshot, deleteDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

export interface Installer {
  id?: string;
  name: string;
  mobileNumber: string;
  designation: string;
  portfolio: string;
  imageUrl?: string;
  imageName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const subscribeToInstallers = (callback: (installers: Installer[]) => void) => {
  const installersRef = collection(db, 'installers');
  const q = query(installersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const installers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Installer[];
    callback(installers);
  }, (error) => { console.warn('Firestore snapshot error in src/lib/installers.ts:', error); callback([]); });
};

export const getInstallers = async (): Promise<Installer[]> => {
  const installersRef = collection(db, 'installers');
  const q = query(installersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Installer[];
};

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefined(obj[key]);
      }
    });
    return newObj;
  }
  return obj;
};

export const saveInstaller = async (installerData: Partial<Installer>) => {
  try {
    const installersRef = collection(db, 'installers');
    const finalData = removeUndefined(installerData);
    const dataToSave = {
      ...finalData,
      updatedAt: serverTimestamp(),
    };

    if (finalData.id) {
      const { id, ...updateData } = dataToSave;
      const docRef = doc(db, 'installers', id);
      await updateDoc(docRef, updateData);
      return id;
    } else {
      dataToSave.createdAt = serverTimestamp();
      const docRef = await addDoc(installersRef, dataToSave);
      return docRef.id;
    }
  } catch (error) {
    console.error("Error saving installer: ", error);
    throw error;
  }
};

export const deleteInstaller = async (id: string) => {
  try {
    const docRef = doc(db, 'installers', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting installer: ", error);
    throw error;
  }
};
