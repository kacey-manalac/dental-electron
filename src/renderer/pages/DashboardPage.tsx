import { Link } from 'react-router-dom';
import {
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ClockIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { usePatients } from '../hooks/usePatients';
import { useAppointments } from '../hooks/useAppointments';
import { useDueRecalls } from '../hooks/useRecalls';
import * as appointmentService from '../services/appointments';
import { getTreatments } from '../services/treatments';
import { getInvoices } from '../services/billing';
import { unwrap } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format } from 'date-fns';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const statCardStyles = [
  {
    gradient: 'from-sky-500 to-sky-400',
    iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    iconColor: 'text-sky-500',
  },
  {
    gradient: 'from-emerald-500 to-emerald-400',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  {
    gradient: 'from-amber-500 to-amber-400',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-500',
  },
  {
    gradient: 'from-violet-500 to-violet-400',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    iconColor: 'text-violet-500',
  },
];

export default function DashboardPage() {
  const refetchInterval = 30000; // Auto-refresh every 30 seconds

  const { data: patientsData, isLoading: loadingPatients } = usePatients({ limit: 5 });

  // Today's appointments — query scoped to today only, high limit to get accurate count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const { data: todayAppointments } = useQuery({
    queryKey: ['appointments', 'today-count'],
    queryFn: () => appointmentService.getAppointments({
      startDate: today.toISOString(),
      endDate: endOfToday.toISOString(),
      limit: 1,
    }),
    refetchInterval,
  });

  // Upcoming appointments for the list (from today onward, soonest first)
  const { data: appointmentsData, isLoading: loadingAppointments, isError: errorAppointments } = useAppointments({
    limit: 5,
    startDate: today.toISOString(),
    sortOrder: 'asc',
  });

  const { data: pendingTreatments } = useQuery({
    queryKey: ['treatments', 'pending-count'],
    queryFn: () => getTreatments({ status: 'PLANNED' as any, limit: 1 }),
    refetchInterval,
  });

  const { data: inProgressTreatments } = useQuery({
    queryKey: ['treatments', 'inprogress-count'],
    queryFn: () => getTreatments({ status: 'IN_PROGRESS' as any, limit: 1 }),
    refetchInterval,
  });

  const { data: pendingInvoices } = useQuery({
    queryKey: ['invoices', 'pending-count'],
    queryFn: () => getInvoices({ status: 'PENDING' as any, limit: 1 }),
    refetchInterval,
  });

  const { data: overdueInvoices } = useQuery({
    queryKey: ['invoices', 'overdue-count'],
    queryFn: () => getInvoices({ status: 'OVERDUE' as any, limit: 1 }),
    refetchInterval,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async () => unwrap(await window.electronAPI.analytics.alerts()),
    refetchInterval,
  });

  const { data: dueRecalls } = useDueRecalls();

  const treatmentCount = (pendingTreatments?.pagination.total || 0) + (inProgressTreatments?.pagination.total || 0);
  const invoiceCount = (pendingInvoices?.pagination.total || 0) + (overdueInvoices?.pagination.total || 0);

  const totalAlerts = (alertsData?.overdueInvoices.count || 0) + (alertsData?.lowStock.count || 0) + (alertsData?.overdueRecalls.count || 0);

  const stats = [
    {
      name: 'Total Patients',
      value: patientsData?.pagination.total || 0,
      icon: UserGroupIcon,
      href: '/patients',
    },
    {
      name: "Today's Appointments",
      value: todayAppointments?.pagination.total || 0,
      icon: CalendarIcon,
      href: '/appointments',
    },
    {
      name: 'Pending Treatments',
      value: treatmentCount,
      icon: ClipboardDocumentListIcon,
      href: '/treatments',
    },
    {
      name: 'Pending Invoices',
      value: invoiceCount,
      icon: CurrencyDollarIcon,
      href: '/billing',
    },
  ];

  const formattedDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {getGreeting()}, <span className="text-gradient">Welcome back</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/patients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:from-primary-700 hover:to-primary-600 hover:shadow-lg hover:shadow-primary-500/20 transition-all active:scale-[0.98]"
          >
            <PlusIcon className="w-4 h-4" />
            New Patient
          </Link>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-surface-800 text-gray-700 dark:text-gray-200 text-sm font-medium border border-gray-300 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
          >
            <CalendarIcon className="w-4 h-4" />
            New Appointment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const style = statCardStyles[i];
          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="group relative bg-white dark:bg-surface-800 overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700/50 shadow-card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
            >
              {/* Gradient left border strip */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${style.gradient}`} />

              <div className="p-5 pl-6">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${style.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${style.iconColor}`} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {stat.name}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Patients */}
        <Card title="Recent Patients" action={<Link to="/patients" className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">View all</Link>}>
          {loadingPatients ? (
            <LoadingSpinner />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/30">
              {patientsData?.data.map((patient) => (
                <Link
                  key={patient.id}
                  to={`/patients/${patient.id}`}
                  className="group flex items-center py-3 hover:bg-gray-50/50 dark:hover:bg-surface-900/30 -mx-6 px-6 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 dark:from-primary-500/30 dark:to-primary-600/30 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {patient.phone}
                    </p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
              {patientsData?.data.length === 0 && (
                <p className="py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No patients yet
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Upcoming Appointments */}
        <Card title="Upcoming Appointments" action={<Link to="/appointments" className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors">View all</Link>}>
          {loadingAppointments ? (
            <LoadingSpinner />
          ) : errorAppointments ? (
            <p className="py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
              No upcoming appointments
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/30">
              {appointmentsData?.data.map((appointment) => (
                <div key={appointment.id} className="flex items-start gap-4 py-3">
                  {/* Vertical teal accent bar */}
                  <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary-500 to-primary-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {appointment.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {appointment.patient?.firstName} {appointment.patient?.lastName}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(appointment.startTime), 'MMM d')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(appointment.startTime), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!appointmentsData?.data || appointmentsData.data.length === 0) && (
                <p className="py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No upcoming appointments
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Attention Needed + Recalls Row */}
      {(totalAlerts > 0 || (dueRecalls && dueRecalls.length > 0)) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Attention Needed */}
          {totalAlerts > 0 && (
            <Card title={<span className="flex items-center gap-2"><BellAlertIcon className="h-5 w-5 text-amber-500" /> Attention Needed</span>}>
              <div className="space-y-3">
                {alertsData!.overdueInvoices.count > 0 && (
                  <Link to="/billing" className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    <CurrencyDollarIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">Overdue Invoices</p>
                      <p className="text-xs text-red-600 dark:text-red-400/70">
                        {alertsData!.overdueInvoices.items.slice(0, 3).map(i => i.invoiceNumber).join(', ')}
                      </p>
                    </div>
                    <Badge variant="red">{alertsData!.overdueInvoices.count}</Badge>
                  </Link>
                )}
                {alertsData!.lowStock.count > 0 && (
                  <Link to="/supplies" className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                    <ArchiveBoxIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Low Stock Supplies</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400/70">
                        {alertsData!.lowStock.items.slice(0, 3).map(s => s.name).join(', ')}
                      </p>
                    </div>
                    <Badge variant="orange">{alertsData!.lowStock.count}</Badge>
                  </Link>
                )}
                {alertsData!.overdueRecalls.count > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <ClockIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Overdue Recalls</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400/70">
                        {alertsData!.overdueRecalls.items.slice(0, 3).map(r => `${r.patient?.firstName} ${r.patient?.lastName}`).join(', ')}
                      </p>
                    </div>
                    <Badge variant="yellow">{alertsData!.overdueRecalls.count}</Badge>
                  </div>
                )}
                {alertsData!.todaysAppointments.count > 0 && (
                  <Link to="/appointments" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <CalendarIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Today&apos;s Appointments</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400/70">
                        {alertsData!.todaysAppointments.count} appointment{alertsData!.todaysAppointments.count !== 1 ? 's' : ''} scheduled
                      </p>
                    </div>
                    <Badge variant="blue">{alertsData!.todaysAppointments.count}</Badge>
                  </Link>
                )}
              </div>
            </Card>
          )}

          {/* Patients Due for Recall */}
          {dueRecalls && dueRecalls.length > 0 && (
            <Card title={<span className="flex items-center gap-2"><ClockIcon className="h-5 w-5 text-amber-500" /> Patients Due for Recall</span>}>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/30">
                {dueRecalls.slice(0, 5).map((recall) => (
                  <Link
                    key={recall.id}
                    to={`/patients/${recall.patientId}`}
                    className="group flex items-center justify-between py-3 hover:bg-gray-50/50 dark:hover:bg-surface-900/30 -mx-6 px-6 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {recall.patient?.firstName} {recall.patient?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {recall.recallType} &middot; Due {format(new Date(recall.nextDueDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant={recall.status === 'OVERDUE' ? 'red' : 'yellow'}>
                      {recall.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
