interface DentalOverviewProps {
  summary: {
    total: number;
    healthy: number;
    cavities: number;
    filled: number;
    crowns: number;
    missing: number;
    implants: number;
    rootCanals: number;
  };
}

export default function DentalOverview({ summary }: DentalOverviewProps) {
  const healthPercentage = Math.round((summary.healthy / summary.total) * 100);

  const stats = [
    { label: 'Healthy', value: summary.healthy, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    { label: 'Cavities', value: summary.cavities, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    { label: 'Filled', value: summary.filled, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    { label: 'Crowns', value: summary.crowns, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    { label: 'Missing', value: summary.missing, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    { label: 'Implants', value: summary.implants, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    { label: 'Root Canals', value: summary.rootCanals, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Oral Health Overview</h3>
        <div className="flex items-center">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(healthPercentage / 100) * 176} 176`}
                className="text-green-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900 dark:text-white">
              {healthPercentage}%
            </span>
          </div>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Health Score</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-3 rounded-lg ${stat.color} text-center`}
          >
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
