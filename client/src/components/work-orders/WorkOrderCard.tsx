import { WorkOrder } from '../../types';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Profile } from '../../types';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onClick?: () => void;
}

export default function WorkOrderCard({ workOrder, onClick }: WorkOrderCardProps) {
  const { data: assignedUser } = useQuery<Profile>({
    queryKey: ['/api/profiles', workOrder.assignedTo],
    queryFn: async () => {
      const response = await fetch(`/api/profiles/${workOrder.assignedTo}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!workOrder.assignedTo,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = workOrder.dueDate && new Date(workOrder.dueDate) < new Date() && workOrder.status !== 'completed';

  return (
    <div 
      className={`flex items-center justify-between p-4 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
        isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
      }`}
      onClick={onClick}
      data-testid="work-order-card"
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-primary-700 font-semibold text-sm">
            {workOrder.foNumber.split('-')[1]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {workOrder.description}
          </h3>
          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
            <span>
              Equipment: {workOrder.assetModel || 'Not specified'}
            </span>
            {assignedUser && (
              <span>
                Assigned: {assignedUser.firstName} {assignedUser.lastName}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 flex-shrink-0">
        <Badge className={getStatusColor(workOrder.status)}>
          {workOrder.status.replace('_', ' ')}
        </Badge>
        <Badge className={getPriorityColor(workOrder.priority)}>
          {workOrder.priority}
        </Badge>
        <div className="text-sm text-gray-500 text-right">
          {workOrder.dueDate ? (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              Due: {formatDistanceToNow(new Date(workOrder.dueDate), { addSuffix: true })}
            </span>
          ) : (
            <span>No due date</span>
          )}
        </div>
      </div>
    </div>
  );
}
