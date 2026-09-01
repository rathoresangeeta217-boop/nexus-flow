import { useState, useEffect } from 'react';
import { UserProfile, getAllUsers, updateUserProfile } from '../lib/users';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, UserX, Shield, Loader2, User } from 'lucide-react';

export function UsersTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (uid: string, currentStatus: boolean | undefined) => {
    try {
      await updateUserProfile(uid, { isActive: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert("Failed to update user status");
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'employee' | 'viewer') => {
    try {
      await updateUserProfile(uid, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert("Failed to update user role");
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">User</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.displayName}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as any)}
                      disabled={user.uid === profile.uid} // Don't let admin change their own role here
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="employee">Employee</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Pending Approval
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleActive(user.uid, user.isActive)}
                      disabled={user.uid === profile.uid}
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        user.isActive 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {user.isActive ? (
                        <><UserX className="w-4 h-4 mr-1.5" /> Suspend</>
                      ) : (
                        <><UserCheck className="w-4 h-4 mr-1.5" /> Approve</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
