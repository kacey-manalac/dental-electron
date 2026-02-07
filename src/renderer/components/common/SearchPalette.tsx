import { Fragment, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { globalSearch } from '../../services/search';
import { format } from 'date-fns';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPalette({ isOpen, onClose }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const navigate = useNavigate();

  // Reset query when modal closes
  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  const { data: results } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  const goTo = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const hasResults =
    (results?.patients?.length || 0) > 0 ||
    (results?.appointments?.length || 0) > 0 ||
    (results?.treatments?.length || 0) > 0 ||
    (results?.invoices?.length || 0) > 0;

  const showEmpty = debouncedQuery.length >= 2 && !hasResults;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 pt-[15vh]">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-surface-800 border border-gray-200/60 dark:border-gray-700/50 shadow-modal transition-all">
              {/* Search input */}
              <div className="flex items-center border-b border-gray-200 dark:border-gray-700/50 px-4">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search patients, appointments, invoices..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 border-0 bg-transparent py-3.5 px-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0"
                  autoFocus
                />
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-medium text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {debouncedQuery.length < 2 && (
                  <div className="py-8 text-center text-sm text-gray-400">
                    Type at least 2 characters to search
                  </div>
                )}

                {showEmpty && (
                  <div className="py-8 text-center text-sm text-gray-400">
                    No results for &quot;{debouncedQuery}&quot;
                  </div>
                )}

                {/* Patients */}
                {results?.patients && results.patients.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-900/50">
                      Patients
                    </div>
                    {results.patients.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => goTo(`/patients/${p.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-surface-700/50 transition-colors text-left"
                      >
                        <UserGroupIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{p.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Appointments */}
                {results?.appointments && results.appointments.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-900/50">
                      Appointments
                    </div>
                    {results.appointments.map((a: any) => (
                      <button
                        key={a.id}
                        onClick={() => goTo(a.patient?.id ? `/patients/${a.patient.id}` : '/appointments')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-surface-700/50 transition-colors text-left"
                      >
                        <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {a.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {a.patient?.firstName} {a.patient?.lastName} &middot; {format(new Date(a.startTime), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Treatments */}
                {results?.treatments && results.treatments.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-900/50">
                      Treatments
                    </div>
                    {results.treatments.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => goTo(`/treatments?search=${encodeURIComponent(debouncedQuery)}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-surface-700/50 transition-colors text-left"
                      >
                        <ClipboardDocumentListIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {t.procedureName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {t.patient?.firstName} {t.patient?.lastName} &middot; ${Number(t.cost).toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Invoices */}
                {results?.invoices && results.invoices.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-900/50">
                      Invoices
                    </div>
                    {results.invoices.map((inv: any) => (
                      <button
                        key={inv.id}
                        onClick={() => goTo('/billing')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-surface-700/50 transition-colors text-left"
                      >
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {inv.patient?.firstName} {inv.patient?.lastName} &middot; ${Number(inv.total).toFixed(2)} &middot; {inv.status}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
