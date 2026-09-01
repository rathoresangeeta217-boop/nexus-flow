import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export interface Project {
  id: string;
  docId?: string;
  name: string;
  customerName?: string;
  orderNo?: string;
  createdAt: any;
}

const getProjectsCollection = () => collection(db, 'projects');

export const saveProject = async (projectData: Partial<Project>) => {
  const finalData = Object.fromEntries(
    Object.entries(projectData).filter(([k, v]) => v !== undefined && k !== 'docId')
  );

  if (projectData.docId) {
    const docRef = doc(db, 'projects', projectData.docId);
    await updateDoc(docRef, finalData);
    return projectData.docId;
  }

  const docRef = await addDoc(getProjectsCollection(), {
    ...finalData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const subscribeToProjects = (callback: (projects: Project[]) => void) => {
  let unsubscribeSnapshot: () => void;
  
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      const q = query(getProjectsCollection(), orderBy('createdAt', 'desc'));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.data().id || doc.id,
          docId: doc.id
        })) as Project[];
        callback(projects);
      }, (error) => {
        console.error("Error fetching projects:", error);
      });
    } else {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      callback([]);
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};
