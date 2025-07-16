import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  User, 
  Wrench, 
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle 
} from 'lucide-react';
import { WorkOrder, Attachment } from '@/types';
import FileUpload from '@/components/FileUpload';
import DocumentPreview from '@/components/DocumentPreview';
import { useToast } from '@/hooks/use-toast';

interface WorkOrderDetailViewProps {
  workOrderId: string;
  onClose?: () => void;
}

const WorkOrderDetailView: React.FC<WorkOrderDetailViewProps> = ({ 
  workOrderId, 
  onClose 
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');

  // Fetch work order details
  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: async () => {
      const response = await fetch(`/api/work-orders/${workOrderId}`);
      if (!response.ok) throw new Error('Failed to fetch work order');
      return (await response.json()) as WorkOrder;
    },
  });

  // Fetch attachments
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['attachments', workOrderId],
    queryFn: async () => {
      const response = await fetch(`/api/attachments?workOrderId=${workOrderId}`);
      if (!response.ok) throw new Error('Failed to fetch attachments');
      return (await response.json()) as Attachment[];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleUploadSuccess = (fileUrl: string, fileName: string) => {
    toast({
      title: 'File Uploaded',
      description: `${fileName} uploaded successfully`,
    });
    refetchAttachments();
  };

  const handleUploadError = (error: string) => {
    toast({
      title: 'Upload Failed',
      description: error,
      variant: 'destructive',
    });
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete attachment');
      
      toast({
        title: 'Success',
        description: 'Attachment deleted successfully',
      });
      
      refetchAttachments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete attachment',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) return <div className="p-6">Loading work order...</div>;
  if (error) return <div className="p-6 text-red-600">Error loading work order</div>;
  if (!workOrder) return <div className="p-6">Work order not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Work Order #{workOrder.id}
          </h1>
          <p className="text-gray-600 mt-1">{workOrder.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(workOrder.status)}>
            {getStatusIcon(workOrder.status)}
            <span className="ml-1 capitalize">{workOrder.status.replace('_', ' ')}</span>
          </Badge>
          <Badge className={getPriorityColor(workOrder.priority)}>
            {workOrder.priority} Priority
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="attachments">
            Attachments ({attachments.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="text-sm capitalize">{workOrder.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Area</label>
                    <p className="text-sm">{workOrder.area || 'Not specified'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Equipment</label>
                  <p className="text-sm">{workOrder.assetModel || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm">{workOrder.description}</p>
                </div>
                {workOrder.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm">{workOrder.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment & Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Assignment & Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <p className="text-sm">{workOrder.assignedTo || 'Unassigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Requested By</label>
                  <p className="text-sm">{workOrder.requestedBy}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(workOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {workOrder.dueDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Due Date</label>
                      <p className="text-sm flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(workOrder.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                {workOrder.estimatedHours && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estimated Hours</label>
                    <p className="text-sm">{workOrder.estimatedHours}h</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                workOrderId={workOrderId}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                maxFiles={10}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentPreview
                attachments={attachments}
                onDelete={handleDeleteAttachment}
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                Activity tracking coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
        <Button variant="outline">
          <Wrench className="w-4 h-4 mr-2" />
          Edit Work Order
        </Button>
        {workOrder.status === 'new' && (
          <Button>
            Start Work
          </Button>
        )}
        {workOrder.status === 'in_progress' && (
          <Button>
            Complete Work
          </Button>
        )}
      </div>
    </div>
  );
};

export default WorkOrderDetailView;
