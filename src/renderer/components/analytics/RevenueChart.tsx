import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { RevenueAnalytics } from '../../types';

interface RevenueChartProps {
  data: RevenueAnalytics | undefined;
  isLoading?: boolean;
}

export default function RevenueChart({ data, isLoading }: RevenueChartProps) {
  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data || data.monthly.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No revenue data available</p>
      </div>
    );
  }

  const chartData = data.monthly.map((item) => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
    revenue: item.revenue,
    payments: item.payments,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-green-600">
            Revenue: <span className="font-medium">{formatCurrency(payload[0].value)}</span>
          </p>
          <p className="text-sm text-blue-600">
            Payments: <span className="font-medium">{payload[1]?.value || 0}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate totals
  const totalRevenue = data.monthly.reduce((sum, item) => sum + item.revenue, 0);
  const totalPayments = data.monthly.reduce((sum, item) => sum + item.payments, 0);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">Total Revenue</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">Total Payments</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalPayments}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 10, right: 10 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} />
            <YAxis
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#10b981"
              fill="url(#colorRevenue)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="payments"
              name="Payments"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
