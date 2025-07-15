import { Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useQuery } from '@tanstack/react-query';
import { WorkOrder, Equipment } from '../../types';
import { formatDistanceToNow } from 'date-fns';

export default function UpcomingMaintenance() {
  const { data: workOrders, isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders', { type: 'preventive', status: ['new', 'assigned'] }],
    queryFn: async () => {
      const response = await fetch('/api/work-orders?status=new,assigned', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch work orders');
      return response.json();
    },
  });

  const { data: equipment } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
    queryFn: async () => {
      const response = await fetch('/api/equipment', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch equipment');
      return response.json();
    },
  });

  const upcomingMaintenance = workOrders
    ?.filter(wo => wo.type === 'preventive' && wo.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5) || [];

  const getEquipmentTag = (equipmentId: string) => {
    return equipment?.find(e => e.id === equipmentId)?.assetTag || 'Unknown';
  };

  const isOverdue = (dueDate: string | Date) => {
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Upcoming Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
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
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Upcoming Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingMaintenance.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming maintenance scheduled</p>
        ) : (
          <div className="space-y-4">
            {upcomingMaintenance.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  isOverdue(item.dueDate!) ? 'bg-error-500' :
                  new Date(item.dueDate!).getTime() - Date.now() < 24 * 60 * 60 * 1000 ? 'bg-warning-500' :
                  'bg-success-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {getEquipmentTag(item.equipmentId!)} - {item.assetModel}
                    </p>
                    {isOverdue(item.dueDate!) && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">
                    Due: {formatDistanceToNow(new Date(item.dueDate!), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
