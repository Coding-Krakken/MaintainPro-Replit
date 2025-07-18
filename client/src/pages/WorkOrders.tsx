import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Search, Filter, Plus } from 'lucide-react';
import { useWorkOrders } from '../hooks/useWorkOrders';
import { WorkOrderFilters } from '../types';
import WorkOrderCard from '../components/work-orders/WorkOrderCard';
import WorkOrderModal from '../components/work-orders/WorkOrderModal';

export default function WorkOrders() {
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredWorkOrders = workOrders?.filter(wo => 
    !searchQuery || 
    wo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.foNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.assetModel?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <>
      <div>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Work Orders
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and track all maintenance work orders
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="mt-4 sm:mt-0"
            data-testid="create-work-order-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search work orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>

              {/* Status Filter */}
              <Select onValueChange={handleStatusFilter}>
                <SelectTrigger data-testid="status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select onValueChange={handlePriorityFilter}>
                <SelectTrigger>
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

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({});
                  setSearchQuery('');
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Work Orders ({filteredWorkOrders.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-4 border rounded-lg">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredWorkOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {searchQuery || Object.keys(filters).length > 0
                    ? 'No work orders found matching your criteria'
                    : 'No work orders found'
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Create First Work Order
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWorkOrders.map((workOrder) => (
                  <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
