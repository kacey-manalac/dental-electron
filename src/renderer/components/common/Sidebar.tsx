import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '../../store/uiStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Patients', href: '/patients', icon: UserGroupIcon },
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
  { name: 'Treatments', href: '/treatments', icon: ClipboardDocumentListIcon },
  { name: 'Billing', href: '/billing', icon: CurrencyDollarIcon },
  { name: 'Supplies', href: '/supplies', icon: ArchiveBoxIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
];

const systemNavigation = [
  { name: 'Settings', href: '/admin', icon: Cog6ToothIcon },
];

function NavTooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
      {show && hovered && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-surface-800 text-white text-xs font-medium shadow-lg border border-gray-700/50 whitespace-nowrap z-50 animate-scale-in">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-surface-800" />
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed }: { item: typeof navigation[0]; collapsed: boolean }) {
  return (
    <NavTooltip label={item.name} show={collapsed}>
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
            isActive
              ? 'bg-primary-500/10 text-primary-400 border-l-[3px] border-primary-400'
              : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-200 border-l-[3px] border-transparent'
          } ${collapsed ? 'justify-center' : ''}`
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
      </NavLink>
    </NavTooltip>
  );
}

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const collapsed = !sidebarOpen;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-surface-850 shadow-sidebar transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C8 2 5 5 5 9c0 2 1 4 1 6 0 3 1 7 3 7s2-4 3-4 1 4 3 4 3-4 3-7c0-2 1-4 1-6 0-4-3-7-7-7z" />
              </svg>
            </div>
            {sidebarOpen && (
              <span className="text-lg font-semibold text-white tracking-tight">
                DentalCare <span className="text-primary-400 font-bold">Pro</span>
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-700/40 transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeftIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Menu
            </p>
          )}
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} collapsed={collapsed} />
          ))}

          <div className="pt-4 mt-4 border-t border-gray-700/30">
            {sidebarOpen && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                System
              </p>
            )}
            {systemNavigation.map((item) => (
              <NavItem key={item.name} item={item} collapsed={collapsed} />
            ))}
          </div>
        </nav>

        {/* Bottom status */}
        <div className="px-4 py-3 border-t border-gray-700/30">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {sidebarOpen && (
              <div className="flex items-center justify-between flex-1">
                <span className="text-xs text-gray-500">System Online</span>
                <span className="text-xs font-semibold text-orange-500">v{__APP_VERSION__}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
