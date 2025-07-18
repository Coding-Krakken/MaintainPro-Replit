import { TrendingUp, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { useQuery } from '@tanstack/react-query';
import { DashboardStats as StatsType } from '../../types';

export default function DashboardStats() {
  const { data: stats, isLoading } = useQuery<StatsType>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Work Orders',
      value: stats?.totalWorkOrders || 0,
      change: '+12% from last week',
      changeType: 'positive' as const,
      icon: TrendingUp,
      iconBg: 'bg-primary-50',
      iconColor: 'text-primary-600',
      testId: 'total-work-orders',
    },
    {
      title: 'Pending Work Orders',
      value: stats?.pendingWorkOrders || 0,
      change: 'Requires immediate attention',
      changeType: 'negative' as const,
      icon: AlertTriangle,
      iconBg: 'bg-error-50',
      iconColor: 'text-error-600',
      testId: 'pending-work-orders',
    },
    {
      title: 'Completed Work Orders',
      value: stats?.completedWorkOrders || 0,
      change: `${stats?.completedWorkOrders || 0} completed this week`,
      changeType: 'positive' as const,
      icon: CheckCircle,
      iconBg: 'bg-success-50',
      iconColor: 'text-success-600',
      testId: 'completed-work-orders',
    },
    {
      title: 'Active Equipment',
      value: stats?.activeEquipment || 0,
      change: `${stats?.activeEquipment || 0} of ${stats?.totalEquipment || 0} assets`,
      changeType: 'neutral' as const,
      icon: Package,
      iconBg: 'bg-warning-50',
      iconColor: 'text-warning-600',
      testId: 'active-equipment',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <Card key={stat.title} className="shadow-sm border border-gray-200">
          <CardContent className="p-6" data-testid={stat.testId}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-sm mt-1 ${
                  stat.changeType === 'positive' ? 'text-success-600' :
                  stat.changeType === 'negative' ? 'text-error-600' :
                  stat.changeType === 'neutral' ? 'text-gray-500' :
                  'text-gray-500'
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
