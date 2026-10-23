import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { UserProfile, getUserProfile, createUserProfile } from '../lib/users';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    // Safety timer: Ensure loading never stays true indefinitely
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);
      setUser(currentUser);
      if (currentUser) {
        try {
          // Timeout after 2.5s if Firestore connection stalls
          const fetchPromise = getUserProfile(currentUser.uid);
          const timeoutPromise = new Promise<UserProfile | null>((resolve) => 
            setTimeout(() => resolve(null), 2500)
          );

          let p = await Promise.race([fetchPromise, timeoutPromise]);
          if (!p) {
            const isSuperAdmin = currentUser.email === 'marketing.srkmodular@gmail.com' || currentUser.email === 'rathoresangeeta217@gmail.com';
            const isAdmin = isSuperAdmin || currentUser.email === 'nidhi@srkmodular.com';
            
            const pData: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || (currentUser.email === 'nidhi@srkmodular.com' ? 'Nidhi Sharma' : 'SRK Administrator'),
              role: isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : 'employee',
              isActive: true,
            };
            try {
              await createUserProfile(pData);
            } catch (createErr) {
              console.warn("Could not save user profile to firestore", createErr);
            }
            p = pData;
          }
          setProfile(p);
        } catch (err: any) {
          console.warn("Error fetching/creating profile", err);
          const isSuperAdmin = currentUser.email === 'marketing.srkmodular@gmail.com' || currentUser.email === 'rathoresangeeta217@gmail.com';
          const isAdmin = isSuperAdmin || currentUser.email === 'nidhi@srkmodular.com';
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || (currentUser.email === 'nidhi@srkmodular.com' ? 'Nidhi Sharma' : 'SRK Administrator'),
            role: isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : 'employee',
            isActive: true,
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, authError, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
