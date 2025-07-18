import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useWorkOrders } from '../../hooks/useWorkOrders';
import { WorkOrderFilters } from '../../types';
import WorkOrderCard from './WorkOrderCard';
import WorkOrderModal from './WorkOrderModal';

export default function WorkOrderList() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<WorkOrderFilters>({});

  const { data: workOrders, isLoading } = useWorkOrders(filters);

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : [status],
    }));
  };

  const handlePriorityFilter = (priority: string) => {
    setFilters(prev => ({
      ...prev,
      priority: priority === 'all' ? undefined : [priority],
    }));
  };

  return (
    <>
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Recent Work Orders
            </CardTitle>
            <div className="flex items-center space-x-3">
              {/* Status Filter */}
              <Select onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select onValueChange={handlePriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {/* Create Button */}
              <Button onClick={() => setShowCreateModal(true)}>
                + New Work Order
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse p-4 border rounded-lg">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : workOrders?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No work orders found</p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
              >
                Create First Work Order
              </Button>
            </div>
          ) : (
            <div className="space-y-4" data-testid="work-order-list">
              {workOrders?.map((workOrder) => (
                <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
              ))}
              
              {workOrders && workOrders.length > 0 && (
                <div className="text-center mt-6">
                  <Button variant="outline">
                    View All Work Orders
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Work Order Modal */}
      {showCreateModal && (
        <WorkOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
