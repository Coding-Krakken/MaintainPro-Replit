import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useQuery } from '@tanstack/react-query';
import { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';

export default function RecentAlerts() {
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  const recentAlerts = notifications?.slice(0, 5) || [];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'wo_overdue':
      case 'equipment_alert':
        return AlertTriangle;
      case 'part_low_stock':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'wo_overdue':
      case 'equipment_alert':
        return {
          bg: 'bg-error-50',
          border: 'border-error-200',
          text: 'text-error-800',
          icon: 'text-error-600',
        };
      case 'part_low_stock':
        return {
          bg: 'bg-warning-50',
          border: 'border-warning-200',
          text: 'text-warning-800',
          icon: 'text-warning-600',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
        };
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse p-3 border rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {recentAlerts.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent alerts</p>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              const styles = getAlertStyle(alert.type);
              
              return (
                <div
                  key={alert.id}
                  className={`flex items-start space-x-3 p-3 ${styles.bg} border ${styles.border} rounded-lg`}
                >
                  <Icon className={`w-5 h-5 ${styles.icon} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${styles.text}`}>
                      {alert.title}
                    </p>
                    <p className={`text-xs ${styles.text} opacity-80 mt-1`}>
                      {alert.message}
                    </p>
                    <p className={`text-xs ${styles.text} opacity-60 mt-1`}>
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
