const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const target = `interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}`;

const replacement = `interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}`;

content = content.replace(target, replacement);

const stateTarget = `  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);`;

const stateReplacement = `  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);`;

content = content.replace(stateTarget, stateReplacement);

const catchTarget = `        } catch (err) {
          console.error("Error fetching/creating profile", err);
        }`;

const catchReplacement = `        } catch (err: any) {
          console.error("Error fetching/creating profile", err);
          if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota') || err?.message?.includes('quota')) {
            setAuthError('Database Quota Exceeded: The free daily limit for database reads has been reached. Please try again tomorrow.');
            const isAdmin = currentUser.email === 'marketing.srkmodular@gmail.com' || currentUser.email === 'rathoresangeeta217@gmail.com';
            setProfile({
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Unknown User',
              role: isAdmin ? 'super_admin' : 'employee',
              isActive: true,
            });
          }
        }`;

content = content.replace(catchTarget, catchReplacement);

const providerTarget = `<AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>`;
const providerReplacement = `<AuthContext.Provider value={{ user, profile, loading, authError, signInWithGoogle, signOut, refreshProfile }}>`;

content = content.replace(providerTarget, providerReplacement);

fs.writeFileSync('src/contexts/AuthContext.tsx', content);
console.log("Patched AuthContext.tsx");
