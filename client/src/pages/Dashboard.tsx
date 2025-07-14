import DashboardStats from '../components/dashboard/DashboardStats';
import WorkOrderList from '../components/work-orders/WorkOrderList';
import QuickActions from '../components/dashboard/QuickActions';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';
import RecentAlerts from '../components/dashboard/RecentAlerts';

export default function Dashboard() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Maintenance Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Overview of maintenance operations and key performance indicators
        </p>
      </div>

      {/* Key Metrics */}
      <DashboardStats />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Work Orders Section */}
        <div className="xl:col-span-2">
          <WorkOrderList />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <QuickActions />
          <UpcomingMaintenance />
          <RecentAlerts />
        </div>
      </div>
    </div>
  );
}
