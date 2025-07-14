import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Equipment, WorkOrder } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Settings, Calendar, MapPin, Hash } from 'lucide-react';
import { useState } from 'react';
import WorkOrderModal from '../work-orders/WorkOrderModal';

interface EquipmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId?: string;
  assetTag?: string;
}

export default function EquipmentDetailModal({ 
  isOpen, 
  onClose, 
  equipmentId, 
  assetTag 
}: EquipmentDetailModalProps) {
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);

  // Fetch equipment by ID or asset tag
  const { data: equipment, isLoading } = useQuery<Equipment>({
    queryKey: equipmentId ? ['/api/equipment', equipmentId] : ['/api/equipment/asset', assetTag],
    queryFn: async () => {
      const url = equipmentId 
        ? `/api/equipment/${equipmentId}`
        : `/api/equipment/asset/${assetTag}`;
      
      const response = await fetch(url, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch equipment');
      return response.json();
    },
    enabled: isOpen && (!!equipmentId || !!assetTag),
  });

  // Fetch recent work orders for this equipment
  const { data: workOrders } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders', { equipmentId: equipment?.id }],
    queryFn: async () => {
      const response = await fetch(`/api/work-orders?equipmentId=${equipment?.id}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch work orders');
      return response.json();
    },
    enabled: !!equipment?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
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

  const recentWorkOrders = workOrders?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!equipment) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Equipment Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-500">
              No equipment found with {equipmentId ? 'ID' : 'asset tag'}: {equipmentId || assetTag}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Equipment Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Equipment Header */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-primary-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <Settings className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{equipment.assetTag}</h3>
              <p className="text-sm text-gray-600">{equipment.description}</p>
            </div>
            
            {/* Equipment Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Status</p>
                </div>
                <Badge className={getStatusColor(equipment.status)}>
                  {equipment.status}
                </Badge>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Location</p>
                </div>
                <p className="text-sm text-gray-900">{equipment.area || 'Not specified'}</p>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Model</p>
                </div>
                <p className="text-sm text-gray-900">{equipment.model}</p>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Criticality</p>
                </div>
                <Badge className={getCriticalityColor(equipment.criticality)}>
                  {equipment.criticality}
                </Badge>
              </div>
            </div>

            {/* Additional Info */}
            {equipment.manufacturer && (
              <div>
                <p className="text-sm font-medium text-gray-500">Manufacturer</p>
                <p className="text-sm text-gray-900">{equipment.manufacturer}</p>
              </div>
            )}

            {equipment.serialNumber && (
              <div>
                <p className="text-sm font-medium text-gray-500">Serial Number</p>
                <p className="text-sm text-gray-900">{equipment.serialNumber}</p>
              </div>
            )}
            
            {/* Recent Work Orders */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Recent Work Orders</h4>
              {recentWorkOrders.length === 0 ? (
                <p className="text-sm text-gray-500">No recent work orders</p>
              ) : (
                <div className="space-y-2">
                  {recentWorkOrders.map((wo) => (
                    <div key={wo.id} className="flex justify-between text-sm">
                      <span className="truncate">{wo.description}</span>
                      <span className="text-gray-500 ml-2">
                        {formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button 
                onClick={() => setShowWorkOrderModal(true)}
                className="flex-1"
              >
                Create Work Order
              </Button>
              <Button variant="outline" className="flex-1">
                View History
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Work Order Creation Modal */}
      {showWorkOrderModal && (
        <WorkOrderModal
          isOpen={showWorkOrderModal}
          onClose={() => setShowWorkOrderModal(false)}
        />
      )}
    </>
  );
}
