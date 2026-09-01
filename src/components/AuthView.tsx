import { useAuth } from '../contexts/AuthContext';
import { LogIn, Loader2, Clock } from 'lucide-react';

export function AuthView() {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();

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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Nexus Flow</h1>
        <p className="text-slate-500 mb-8">Sign in to manage orders, inventory, and operations.</p>
        
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
