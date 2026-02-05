import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ConditionAnalytics } from '../../types';

interface ConditionPieChartProps {
  data: ConditionAnalytics | undefined;
  isLoading?: boolean;
}

const CONDITION_COLORS: Record<string, string> = {
  HEALTHY: '#10b981',
  CAVITY: '#ef4444',
  FILLED: '#3b82f6',
  CROWN: '#f59e0b',
  MISSING: '#6b7280',
  IMPLANT: '#8b5cf6',
  ROOT_CANAL: '#f97316',
};

const CONDITION_LABELS: Record<string, string> = {
  HEALTHY: 'Healthy',
  CAVITY: 'Cavity',
  FILLED: 'Filled',
  CROWN: 'Crown',
  MISSING: 'Missing',
  IMPLANT: 'Implant',
  ROOT_CANAL: 'Root Canal',
};

export default function ConditionPieChart({ data, isLoading }: ConditionPieChartProps) {
  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data || data.byCondition.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No condition data available</p>
      </div>
    );
  }

  const pieData = data.byCondition.map((item) => ({
    name: CONDITION_LABELS[item.condition] || item.condition,
    value: item.count,
    color: CONDITION_COLORS[item.condition] || '#6b7280',
  }));

  const totalTeeth = pieData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalTeeth) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Count: <span className="font-medium">{data.value}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Percentage: <span className="font-medium">{percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Most affected teeth data
  const teethData = data.mostAffectedTeeth.map((item) => ({
    tooth: `#${item.toothNumber}`,
    count: item.affectedCount,
  }));

  return (
    <div className="space-y-6">
      {/* Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Condition Distribution
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2">
          {pieData.map((item) => (
            <div
              key={item.name}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Most Affected Teeth */}
      {teethData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Most Affected Teeth (Non-Healthy Conditions)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teethData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200 dark:stroke-gray-700"
                />
                <XAxis dataKey="tooth" className="text-xs" tick={{ fill: 'currentColor' }} />
                <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                <Tooltip />
                <Bar dataKey="count" name="Affected Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
