import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, MapPin, PackageCheck, AlertCircle, MoreHorizontal, Filter, Package, Users, UserPlus, Phone, Briefcase } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { subscribeToOrders, Order } from '../lib/orders';
import { Installer, subscribeToInstallers, deleteInstaller, getInstallers, saveInstaller } from '../lib/installers';
import { DispatchView } from '../components/DispatchView';
import { InstallerModal } from '../components/InstallerModal';

export function InstallationTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeSection, setActiveSection] = useState<'pending' | 'scheduled' | 'history' | 'team'>('pending');
  const [isInstallerModalOpen, setIsInstallerModalOpen] = useState(false);
  const [selectedInstaller, setSelectedInstaller] = useState<Installer | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const migrateInstallers = async () => {
      const hasMigrated = localStorage.getItem('migrated_installers_v2');
      if (!hasMigrated) {
        try {
          const currentInstallers = await getInstallers();
          for (const installer of currentInstallers) {
            if (installer.id) {
              await deleteInstaller(installer.id);
            }
          }
          
          const newInstallers = [
            { name: 'Tek chand', mobileNumber: '', designation: 'Installer', portfolio: '' },
            { name: 'Pawan jangid', mobileNumber: '', designation: 'Installer', portfolio: '' },
            { name: 'Pankaj', mobileNumber: '', designation: 'Installer', portfolio: '' }
          ];
          
          for (const installer of newInstallers) {
            await saveInstaller(installer);
          }
          
          localStorage.setItem('migrated_installers_v2', 'true');
          console.log('Successfully migrated installers!');
        } catch (error) {
          console.error('Migration failed:', error);
        }
      }
    };
    
    migrateInstallers();
  }, []);

  useEffect(() => {
    let installersUnsubscribe: () => void;
    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setIsLoading(false);
      setSelectedOrder(current => {
        if (!current) return null;
        return fetchedOrders.find(o => o.id === current.id || o.docId === current.docId) || current;
      });
    });
    installersUnsubscribe = subscribeToInstallers((fetchedInstallers) => {
      setInstallers(fetchedInstallers);
    });
    return () => {
      unsubscribe();
      if (installersUnsubscribe) installersUnsubscribe();
    };
  }, []);

  const openDispatchView = (order: Order) => {
    setSelectedOrder(order);
  };

  // Stats
  
  const pendingStatuses = ['Installation Pending'];
  const scheduledStatuses = ['Installation In Progress'];
  const historyStatuses = ['Installation Complete', 'Completed'];

  const displayedOrders = orders.filter(o => {
    // Determine if this order is relevant to installation
    const hasInstallationProduct = o.details?.products?.some(p => p.requiresInstallation) || false;
    const isInstallationStatus = ['Installation Pending', 'Installation In Progress', 'Installation Complete'].includes(o.status);
    
    // Only show if it has an installation product and has reached at least dispatch stage, 
    // OR if it's explicitly in an installation status
    const isReadyForInstall = isInstallationStatus || (hasInstallationProduct && ['Scheduled Dispatched', 'Dispatched', 'Out for Delivery', 'Delivered', 'Completed'].includes(o.status));

    if (activeSection === 'team') return false;

    if (!isReadyForInstall) return false;

    if (activeSection === 'pending') {
      const isPending = pendingStatuses.includes(o.status) || (!isInstallationStatus && hasInstallationProduct && ['Scheduled Dispatched', 'Dispatched', 'Out for Delivery', 'Delivered'].includes(o.status));
      if (!isPending) return false;
    } else if (activeSection === 'scheduled') {
      if (!scheduledStatuses.includes(o.status)) return false;
    } else {
      const isHistory = historyStatuses.includes(o.status) || (!isInstallationStatus && hasInstallationProduct && o.status === 'Completed');
      if (!isHistory) return false;
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesId = o.id?.toLowerCase().includes(q) || o.docId?.toLowerCase().includes(q);
      const matchesCustomer = o.customer?.toLowerCase().includes(q);
      const matchesProject = o.project?.toLowerCase().includes(q);
      if (!matchesId && !matchesCustomer && !matchesProject) return false;
    }
    return true;
  });

  const dispatchedOrders = orders.filter(o => o.status === 'Out for Delivery' || o.status === 'Completed');
  const deliveredCount = orders.filter(o => o.status === 'Completed').length;

  return (
    <>
    <AnimatePresence mode="wait">
      {selectedOrder ? (
        <motion.div key="dispatch-view">
          <DispatchView 
            order={selectedOrder} 
            onBack={() => setSelectedOrder(null)} 
            isInstallationView={true}
          />
        </motion.div>
      ) : (
        <motion.div 
          key="list-view"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6 pb-8"
        >
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Installation</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Track pending and completed installations.</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Pending Installs" 
              value={dispatchedOrders.length.toString()} 
              icon={<Truck className="w-5 h-5" />}
              colorClass="bg-blue-50 text-blue-600"
            />
            <StatCard 
              title="Total Orders" 
              value={orders.length.toString()} 
              icon={<Package className="w-5 h-5" />}
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              title="Completed" 
              value={deliveredCount.toString()} 
              icon={<PackageCheck className="w-5 h-5" />}
              colorClass="bg-indigo-50 text-indigo-600"
            />
          </div>

          {/* Main Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 flex flex-col"
          >
            
          {/* Section Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-2xl">
            <button
              onClick={() => setActiveSection('pending')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSection === 'pending' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pending Installation
            </button>
            <button
              onClick={() => setActiveSection('scheduled')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSection === 'scheduled' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSection === 'history' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveSection('team')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center ${
                activeSection === 'team' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4 mr-1.5" />
              Team
            </button>
          </div>

            <div className="bg-white rounded-t-xl border border-slate-200 flex items-center justify-between px-6 py-4 mt-4">
              <h2 className="font-bold text-slate-800">
                {activeSection === 'pending' ? 'Pending Installation' : 
                 activeSection === 'scheduled' ? 'In Progress Installations' : 
                 activeSection === 'team' ? 'Installation Team' : 
                 'Installation History'}
              </h2>
              <div className="flex gap-2">
                {activeSection === 'team' ? (
                  <button 
                    onClick={() => {
                      setSelectedInstaller(null);
                      setIsInstallerModalOpen(true);
                    }}
                    className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Installer
                  </button>
                ) : (
                  <button className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50">
                    <Filter className="w-3.5 h-3.5 mr-1.5 inline" /> Filters
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 bg-white border-x border-b border-slate-200 overflow-hidden rounded-b-xl">
              {activeSection === 'team' ? (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[600px]">
                  {installers.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500">
                      No installers added yet. Click "Add Installer" to get started.
                    </div>
                  ) : (
                    installers.map((installer) => (
                      <motion.div 
                        key={installer.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                      >
                        <div className="p-5 flex items-start gap-4 border-b border-slate-100">
                          {installer.imageUrl ? (
                            <img src={installer.imageUrl} alt={installer.name} className="w-16 h-16 rounded-full object-cover bg-slate-100" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                              <Users className="w-8 h-8" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">{installer.name}</h3>
                            <p className="text-sm text-indigo-600 font-medium">{installer.designation || 'Installer'}</p>
                            <div className="flex items-center text-slate-500 mt-1 text-sm">
                              <Phone className="w-3.5 h-3.5 mr-1.5" />
                              {installer.mobileNumber}
                            </div>
                          </div>
                        </div>
                        {installer.portfolio && (
                          <div className="p-4 bg-slate-50 flex-1">
                            <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                              Portfolio & Experience
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">{installer.portfolio}</p>
                          </div>
                        )}
                        <div className="p-3 bg-white border-t border-slate-100 flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedInstaller(installer);
                              setIsInstallerModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirmingDeleteId === installer.id) {
                                if (installer.id) await deleteInstaller(installer.id);
                                setConfirmingDeleteId(null);
                              } else {
                                setConfirmingDeleteId(installer.id || null);
                                setTimeout(() => setConfirmingDeleteId(null), 3000);
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${confirmingDeleteId === installer.id ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                          >
                            {confirmingDeleteId === installer.id ? 'Click again to confirm' : 'Remove'}
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 border-b border-slate-200">Order ID</th>
                      <th className="px-6 py-3 border-b border-slate-200">Customer</th>
                      <th className="px-6 py-3 border-b border-slate-200">Date</th>
                      <th className="px-6 py-3 border-b border-slate-200">Items</th>
                      <th className="px-6 py-3 border-b border-slate-200">Amount</th>
                      <th className="px-6 py-3 border-b border-slate-200">Status</th>
                      <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading orders...</td></tr>
                    ) : displayedOrders.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No orders found.</td></tr>
                    ) : (
                      displayedOrders.map((order, i) => (
                        <motion.tr 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 * i }}
                          key={`${order.docId || order.id || "k"}-${i}`} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => openDispatchView(order)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-800">{order.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{order.customer}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{order.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {order.details?.products?.filter(p => p.requiresInstallation).reduce((sum, p) => sum + (p.quantity || 1), 0) || 0} Items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{order.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              order.status === 'Completed' ? 'success' : 
                              order.status === 'Out for Delivery' ? 'purple' :
                              order.status === 'In Progress Dispatched' ? 'indigo' :
                      order.status === 'Dispatched' ? 'success' : 
                              order.status === 'New' ? 'info' : 'warning'
                            }>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <InstallerModal
      isOpen={isInstallerModalOpen}
      onClose={() => setIsInstallerModalOpen(false)}
      installer={selectedInstaller}
    />
    </>
  );
}
