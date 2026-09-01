import { Bell, Search, UserCircle, Menu, Command } from 'lucide-react';
import { TabName } from '../types';

export function Header({ activeTab, searchQuery, onSearchChange }: { activeTab: TabName, searchQuery?: string, onSearchChange?: (val: string) => void }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 hidden sm:block">
          {activeTab} Workflow Portal
        </h1>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded">System Online</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            className="bg-slate-100 text-sm border-none rounded-full pl-9 pr-4 py-1.5 w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
          />
        </div>
      </div>
    </header>
  );
}
