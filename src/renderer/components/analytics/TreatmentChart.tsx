import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TreatmentAnalytics } from '../../types';

interface TreatmentChartProps {
  data: TreatmentAnalytics | undefined;
  isLoading?: boolean;
}

export default function TreatmentChart({ data, isLoading }: TreatmentChartProps) {
  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data || data.byProcedure.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No treatment data available</p>
      </div>
    );
  }

  const chartData = data.byProcedure.map((item) => ({
    name: item.procedure.length > 15 ? item.procedure.slice(0, 15) + '...' : item.procedure,
    fullName: item.procedure,
    count: item.count,
    revenue: item.totalRevenue,
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
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{data.fullName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Count: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Revenue: <span className="font-medium">{formatCurrency(data.revenue)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis type="number" className="text-xs" />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="count" name="Procedures" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
