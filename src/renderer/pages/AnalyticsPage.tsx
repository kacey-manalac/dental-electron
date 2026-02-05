import { useState } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import Card from '../components/common/Card';
import DateRangeFilter from '../components/analytics/DateRangeFilter';
import TreatmentChart from '../components/analytics/TreatmentChart';
import RevenueChart from '../components/analytics/RevenueChart';
import PatientTrendsChart from '../components/analytics/PatientTrendsChart';
import ConditionPieChart from '../components/analytics/ConditionPieChart';
import {
  useDashboardStats,
  useTreatmentAnalytics,
  useRevenueAnalytics,
  usePatientAnalytics,
  useConditionAnalytics,
} from '../hooks/useAnalytics';
type TabType = 'overview' | 'treatments' | 'revenue' | 'patients' | 'conditions';

const TABS: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: ChartBarIcon },
  { id: 'treatments', label: 'Treatments', icon: DocumentChartBarIcon },
  { id: 'revenue', label: 'Revenue', icon: CurrencyDollarIcon },
  { id: 'patients', label: 'Patients', icon: UsersIcon },
  { id: 'conditions', label: 'Dental Conditions', icon: ChartBarIcon },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [treatmentDateRange, setTreatmentDateRange] = useState<{
    start?: string;
    end?: string;
  }>({});
  const [revenueMonths, setRevenueMonths] = useState(12);
  const [patientMonths, setPatientMonths] = useState(12);

  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { data: treatmentData, isLoading: treatmentLoading } = useTreatmentAnalytics(
    treatmentDateRange.start,
    treatmentDateRange.end
  );
  const { data: revenueData, isLoading: revenueLoading } = useRevenueAnalytics(revenueMonths);
  const { data: patientData, isLoading: patientLoading } = usePatientAnalytics(patientMonths);
  const { data: conditionData, isLoading: conditionLoading } = useConditionAnalytics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatGrowth = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Insights and metrics for your dental practice
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats?.patients.total || 0}
                  </p>
                  <p
                    className={`text-sm ${
                      (dashboardStats?.patients.growth || 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatGrowth(dashboardStats?.patients.growth || 0)} this month
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Appointments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats?.appointments.thisMonth || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    {dashboardStats?.appointments.upcoming || 0} upcoming
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DocumentChartBarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Treatments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats?.treatments.completedThisMonth || 0}
                  </p>
                  <p className="text-sm text-gray-500">completed this month</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(dashboardStats?.revenue.thisMonth || 0)}
                  </p>
                  <p
                    className={`text-sm ${
                      (dashboardStats?.revenue.growth || 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatGrowth(dashboardStats?.revenue.growth || 0)} vs last month
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Treatment Distribution">
              <TreatmentChart data={treatmentData} isLoading={treatmentLoading} />
            </Card>
            <Card title="Dental Conditions">
              <ConditionPieChart data={conditionData} isLoading={conditionLoading} />
            </Card>
          </div>
        </div>
      )}

      {/* Treatments Tab */}
      {activeTab === 'treatments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Treatment Analytics</h2>
            <DateRangeFilter
              onRangeChange={(start, end) => setTreatmentDateRange({ start, end })}
            />
          </div>
          <Card title="Treatments by Procedure">
            <TreatmentChart data={treatmentData} isLoading={treatmentLoading} />
          </Card>
        </div>
      )}

      {/* Revenue Tab (Admin Only) */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Revenue Analytics</h2>
            <DateRangeFilter
              showMonthsSelector
              onRangeChange={() => {}}
              onMonthsChange={setRevenueMonths}
            />
          </div>
          <Card title="Revenue Over Time">
            <RevenueChart data={revenueData} isLoading={revenueLoading} />
          </Card>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Patient Analytics</h2>
            <DateRangeFilter
              showMonthsSelector
              onRangeChange={() => {}}
              onMonthsChange={setPatientMonths}
            />
          </div>
          <Card title="Patient Trends & Demographics">
            <PatientTrendsChart data={patientData} isLoading={patientLoading} />
          </Card>
        </div>
      )}

      {/* Conditions Tab */}
      {activeTab === 'conditions' && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Dental Conditions</h2>
          <Card title="Condition Distribution">
            <ConditionPieChart data={conditionData} isLoading={conditionLoading} />
          </Card>
        </div>
      )}
    </div>
  );
}
