import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  SunIcon,
  MoonIcon,
  BellIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '../../store/uiStore';
import { useLowStockAlerts } from '../../hooks/useSupplies';
import SearchPalette from './SearchPalette';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/treatments': 'Treatments',
  '/procedures': 'Procedures',
  '/billing': 'Billing',
  '/supplies': 'Supplies',
  '/analytics': 'Analytics',
  '/admin': 'Settings',
};

export default function Header() {
  const { darkMode, toggleDarkMode, toggleSidebar } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { data: lowStockAlerts } = useLowStockAlerts();
  const alertCount = lowStockAlerts?.length || 0;

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const pageTitle = PAGE_TITLES[basePath] || 'DentalCare Pro';

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: mobile menu + page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Bars3Icon className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">
            {pageTitle}
          </h1>
        </div>

        {/* Center: search bar trigger */}
        <div className="hidden md:flex items-center max-w-md flex-1 mx-8">
          <button
            onClick={() => setSearchOpen(true)}
            className="relative w-full flex items-center pl-9 pr-16 py-2 rounded-lg bg-gray-100 dark:bg-surface-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-sm text-gray-400 dark:text-gray-500 transition-all text-left"
          >
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            Search patients, appointments...
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-medium text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <BellIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {alertCount === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No notifications
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          Low Stock Alerts ({alertCount})
                        </div>
                      </div>
                      {lowStockAlerts?.slice(0, 5).map((supply) => (
                        <button
                          key={supply.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/supplies');
                          }}
                          className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {supply.name}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400">
                            Stock: {supply.currentStock} / Min: {supply.minimumStock} {supply.unit}
                          </div>
                        </button>
                      ))}
                      {alertCount > 5 && (
                        <button
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/supplies');
                          }}
                          className="w-full px-4 py-2 text-center text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          View all {alertCount} alerts
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            {darkMode ? (
              <SunIcon className="w-5 h-5 text-amber-400" />
            ) : (
              <MoonIcon className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

          {/* Profile avatar pill */}
          <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">DC</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
              Clinic
            </span>
          </button>
        </div>
      </div>

      <SearchPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
