import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Calendar } from 'lucide-react';
import DashboardStats from '../components/dashboard/DashboardStats';
import WorkOrderList from '../components/work-orders/WorkOrderList';
import QuickActions from '../components/dashboard/QuickActions';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';
import RecentAlerts from '../components/dashboard/RecentAlerts';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('7-days');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    setShowDatePicker(false);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Maintenance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Overview of maintenance operations and key performance indicators
          </p>
        </div>
        
        {/* Date Range Picker */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowDatePicker(!showDatePicker)}
            data-testid="date-range-picker"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {dateRange === '7-days' ? 'Last 7 Days' : 
             dateRange === '30-days' ? 'Last 30 Days' : 
             'Custom Range'}
          </Button>
          
          {showDatePicker && (
            <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg p-2 z-10">
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                onClick={() => handleDateRangeChange('7-days')}
              >
                Last 7 Days
              </button>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                onClick={() => handleDateRangeChange('30-days')}
                data-testid="date-range-30-days"
              >
                Last 30 Days
              </button>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                onClick={() => handleDateRangeChange('90-days')}
              >
                Last 90 Days
              </button>
            </div>
          )}
        </div>
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
