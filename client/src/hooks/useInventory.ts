import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Part, InsertPart, PartsUsage } from '../types';
import { apiRequest } from '../lib/queryClient';

export function useParts() {
  return useQuery<Part[]>({
    queryKey: ['/api/parts'],
    queryFn: async () => {
      const response = await fetch('/api/parts', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch parts');
      return response.json();
    },
  });
}

export function usePart(id: string) {
  return useQuery<Part>({
    queryKey: ['/api/parts', id],
    queryFn: async () => {
      const response = await fetch(`/api/parts/${id}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch part');
      return response.json();
    },
    enabled: !!id,
  });
}

export function usePartByNumber(partNumber: string) {
  return useQuery<Part>({
    queryKey: ['/api/parts/number', partNumber],
    queryFn: async () => {
      const response = await fetch(`/api/parts/number/${partNumber}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch part');
      return response.json();
    },
    enabled: !!partNumber,
  });
}

export function useCreatePart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (part: InsertPart) => {
      const response = await apiRequest('POST', '/api/parts', part);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
    },
  });
}

export function useUpdatePart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPart> }) => {
      const response = await apiRequest('PATCH', `/api/parts/${id}`, data);
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/parts', id] });
    },
  });
}

export function usePartsUsage(workOrderId: string) {
  return useQuery<PartsUsage[]>({
    queryKey: ['/api/work-orders', workOrderId, 'parts-usage'],
    queryFn: async () => {
      const response = await fetch(`/api/work-orders/${workOrderId}/parts-usage`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch parts usage');
      return response.json();
    },
    enabled: !!workOrderId,
  });
}

export function useCreatePartsUsage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ workOrderId, data }: { workOrderId: string; data: any }) => {
      const response = await apiRequest('POST', `/api/work-orders/${workOrderId}/parts-usage`, data);
      return response.json();
    },
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId, 'parts-usage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
    },
  });
}

export function useLowStockParts() {
  const { data: parts } = useParts();
  
  return {
    data: parts?.filter(part => part.stockLevel <= part.reorderPoint) || [],
    isLoading: !parts,
  };
}
