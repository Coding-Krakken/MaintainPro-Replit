import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Attachment } from '@/types';

export const useAttachments = (workOrderId?: string, equipmentId?: string) => {
  const queryClient = useQueryClient();
  
  const queryKey = ['attachments', { workOrderId, equipmentId }];
  
  const { data: attachments = [], ...query } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (workOrderId) params.append('workOrderId', workOrderId);
      if (equipmentId) params.append('equipmentId', equipmentId);
      
      const response = await fetch(`/api/attachments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch attachments');
      return (await response.json()) as Attachment[];
    },
    enabled: !!(workOrderId || equipmentId),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete attachment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const uploadAttachment = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload attachment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    attachments,
    deleteAttachment,
    uploadAttachment,
    ...query,
  };
};
