import { useAuth } from 'wasp/client/auth';
import { useQuery } from 'wasp/client/operations';
import { motion } from 'framer-motion';
import {
  getAdminStats,
  getAllEmailSignups,
  getUserAnalytics,
  getTranslationAnalytics,
} from 'wasp/client/operations';

export default function AdminDashboardPage() {
  const { data: user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery(getAdminStats);
  const { data: signups, isLoading: signupsLoading } = useQuery(getAllEmailSignups);
  const { data: userAnalytics, isLoading: userAnalyticsLoading } = useQuery(getUserAnalytics);
  const { data: translationAnalytics, isLoading: translationAnalyticsLoading } = useQuery(getTranslationAnalytics);

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-fuchsia-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-fuchsia-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">T</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-red-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-slate-500">ThaiCopilot Analytics</p>
              </div>
            </div>
            <a
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
            >
              Back to App
            </a>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            subtitle={`${stats?.paidUsers || 0} paid, ${stats?.freeUsers || 0} free`}
            icon="👥"
            color="purple"
          />
          <MetricCard
            title="Monthly Revenue"
            value={`$${stats?.mrr || 0}`}
            subtitle={`${stats?.conversionRate || 0}% conversion rate`}
            icon="💰"
            color="green"
          />
          <MetricCard
            title="Email Signups"
            value={stats?.totalEmailSignups || 0}
            subtitle="Pre-auth signups"
            icon="📧"
            color="blue"
          />
          <MetricCard
            title="Translations"
            value={stats?.totalTranslations || 0}
            subtitle={`${stats?.totalFlashcards || 0} flashcards`}
            icon="🌐"
            color="fuchsia"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md p-6 border border-purple-100"
          >
            <h2 className="text-xl font-bold text-slate-800 mb-4">User Growth (Last 30 Days)</h2>
            {userAnalyticsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {userAnalytics?.daily.slice(-10).map((day) => (
                  <div key={day.date} className="flex items-center">
                    <span className="text-xs text-slate-500 w-24">{day.date}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="bg-purple-200 h-6 rounded"
                        style={{ width: `${(day.users / Math.max(...userAnalytics.daily.map(d => d.users))) * 100}%` }}
                      ></div>
                      <span className="text-sm font-medium text-slate-700">{day.users}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Signup Sources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md p-6 border border-purple-100"
          >
            <h2 className="text-xl font-bold text-slate-800 mb-4">Signup Sources</h2>
            {userAnalyticsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {userAnalytics?.bySource.map((source) => (
                  <div key={source.source} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{source.source}</span>
                    <span className="text-lg font-bold text-purple-600">{source.count}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Translation Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md p-6 border border-purple-100 mb-8"
        >
          <h2 className="text-xl font-bold text-slate-800 mb-4">Translation Activity</h2>
          {translationAnalyticsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-2">
                  Average translations per user: <span className="font-bold text-purple-600">{translationAnalytics?.avgTranslationsPerUser}</span>
                </p>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Top 10 Users</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {translationAnalytics?.topUsers.map((user, index) => (
                  <div key={user.userEmail} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                      <span className="text-sm text-slate-700 truncate max-w-[200px]">{user.userEmail}</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600">{user.count} translations</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Email Signups Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-md p-6 border border-purple-100"
        >
          <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Email Signups</h2>
          {signupsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Source</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {signups?.slice(0, 20).map((signup) => (
                    <tr key={signup.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-700">{signup.email}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {signup.source || 'direct'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(signup.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: 'purple' | 'green' | 'blue' | 'fuchsia';
}) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    fuchsia: 'from-fuchsia-500 to-fuchsia-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl shadow-md p-6 border border-purple-100"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-800 mb-1">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </motion.div>
  );
}
