import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, Loader2, Clock } from 'lucide-react';

export function AuthView() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
         setAuthError('Email/Password sign-in is not enabled in Firebase Console.');
      } else if (err.code === 'auth/invalid-credential') {
         setAuthError('Invalid credentials. If you haven\'t created the accounts yet, click "Developer: Seed System Accounts" below first!');
      } else {
         setAuthError('Invalid email or password.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (user && profile && !profile.isActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Pending Approval</h2>
          <p className="text-slate-600 mb-6">
            Your account has been created, but it requires administrator approval before you can access the system.
          </p>
          <button
            onClick={signOut}
            className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center transform rotate-3 shadow-lg">
            <div className="bg-white w-8 h-8 rounded-lg transform -rotate-6" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to SRK Modular Furniture co.</h1>
        <p className="text-slate-500 mb-8">Sign in to manage orders, inventory, and operations.</p>
        
        
  <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6 text-left">
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {authError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value.trim())}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Sign In
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={async () => {
              setAuthError('Seeding users... please wait.');
              try {
                const res = await fetch('/api/seed-users', { method: 'POST' });
                const data = await res.json();
                if (data.results && data.results.some((r: any) => r.status === 'error' && r.error === 'OPERATION_NOT_ALLOWED')) {
                  setAuthError('Failed: You must enable "Email/Password" in Firebase Auth Console first!');
                } else if (data.success) {
                  setAuthError('Users seeded successfully! You can now log in.');
                } else {
                  setAuthError(data.error || 'Unknown error occurred.');
                }
              } catch (e: any) {
                setAuthError(e.message);
              }
            }}
            className="text-xs text-slate-400 hover:text-indigo-600 underline"
          >
            Developer: Seed System Accounts
          </button>
        </div>
      </div>
    </div>
  );
}
