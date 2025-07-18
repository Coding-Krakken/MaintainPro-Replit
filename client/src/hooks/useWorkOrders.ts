import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkOrder, InsertWorkOrder, WorkOrderFilters } from '../types';
import { apiRequest } from '../lib/queryClient';

export function useWorkOrders(filters?: WorkOrderFilters) {
  const queryParams = new URLSearchParams();
  
  if (filters?.status) {
    queryParams.set('status', filters.status.join(','));
  }
  if (filters?.assignedTo) {
    queryParams.set('assignedTo', filters.assignedTo);
  }
  if (filters?.priority) {
    queryParams.set('priority', filters.priority.join(','));
  }

  const queryString = queryParams.toString();
  const url = `/api/work-orders${queryString ? `?${queryString}` : ''}`;

  return useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders', filters],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch work orders');
      return response.json();
    },
  });
}

export function useWorkOrder(id: string) {
  return useQuery<WorkOrder>({
    queryKey: ['/api/work-orders', id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/work-orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch work order');
      return response.json();
    },
    enabled: !!id,
  });
}

export function useAssignedWorkOrders(userId: string) {
  return useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders/assigned', userId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/work-orders/assigned/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch assigned work orders');
      return response.json();
    },
    enabled: !!userId,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workOrder: InsertWorkOrder) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
        body: JSON.stringify(workOrder),
      });
      if (!response.ok) throw new Error('Failed to create work order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertWorkOrder> }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/work-orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update work order');
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', id] });
    },
  });
}

export function useWorkOrderChecklist(workOrderId: string) {
  return useQuery({
    queryKey: ['/api/work-orders', workOrderId, 'checklist'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/work-orders/${workOrderId}/checklist`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch checklist');
      return response.json();
    },
    enabled: !!workOrderId,
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/checklist-items/${id}`, data);
      return response.json();
    },
    onSuccess: (_, { id }) => {
      // Invalidate all checklist queries since we don't know which work order this belongs to
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
    },
  });
}
