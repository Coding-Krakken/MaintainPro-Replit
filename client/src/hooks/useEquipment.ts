import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Equipment, InsertEquipment } from '../types';
import { apiRequest } from '../lib/queryClient';

export function useEquipment() {
  return useQuery<Equipment[]>({
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
}

export function useEquipmentById(id: string) {
  return useQuery<Equipment>({
    queryKey: ['/api/equipment', id],
    queryFn: async () => {
      const response = await fetch(`/api/equipment/${id}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch equipment');
      return response.json();
    },
    enabled: !!id,
  });
}

export function useEquipmentByAssetTag(assetTag: string) {
  return useQuery<Equipment>({
    queryKey: ['/api/equipment/asset', assetTag],
    queryFn: async () => {
      const response = await fetch(`/api/equipment/asset/${assetTag}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch equipment');
      return response.json();
    },
    enabled: !!assetTag,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (equipment: InsertEquipment) => {
      const response = await apiRequest('POST', '/api/equipment', equipment);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEquipment> }) => {
      const response = await apiRequest('PATCH', `/api/equipment/${id}`, data);
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment', id] });
    },
  });
}
