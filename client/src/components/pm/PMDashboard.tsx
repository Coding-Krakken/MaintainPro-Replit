import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, CheckCircle, Play, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PMSchedule {
  equipmentId: string;
  templateId: string;
  nextDueDate: string;
  lastCompletedDate?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  isOverdue: boolean;
  complianceStatus: 'compliant' | 'due' | 'overdue';
}

interface ComplianceStatus {
  equipmentId: string;
  compliancePercentage: number;
  missedPMCount: number;
  totalPMCount: number;
  lastPMDate?: string;
  nextPMDate?: string;
}

interface PMTemplate {
  id: string;
  model: string;
  component: string;
  action: string;
  frequency: string;
  active: boolean;
}

const PMDashboard: React.FC = () => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch equipment
  const { data: equipment = [] } = useQuery({
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

  // Fetch PM templates
  const { data: pmTemplates = [] } = useQuery<PMTemplate[]>({
    queryKey: ['/api/pm-templates'],
    queryFn: async () => {
      const response = await fetch('/api/pm-templates', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch PM templates');
      return response.json();
    },
  });

  // Fetch PM schedule for selected equipment
  const { data: pmSchedule = [] } = useQuery<PMSchedule[]>({
    queryKey: ['/api/pm-engine/schedule', selectedEquipmentId],
    queryFn: async () => {
      if (!selectedEquipmentId) return [];
      const response = await fetch(`/api/pm-engine/schedule/${selectedEquipmentId}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch PM schedule');
      return response.json();
    },
    enabled: !!selectedEquipmentId,
  });

  // Fetch compliance status for selected equipment
  const { data: compliance } = useQuery<ComplianceStatus>({
    queryKey: ['/api/pm-engine/compliance', selectedEquipmentId],
    queryFn: async () => {
      if (!selectedEquipmentId) return null;
      const response = await fetch(`/api/pm-engine/compliance/${selectedEquipmentId}`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch compliance status');
      return response.json();
    },
    enabled: !!selectedEquipmentId,
  });

  // Generate PM work orders mutation
  const generatePMsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pm-engine/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to generate PM work orders');
      return response.json();
    },
    onSuccess: (data) => {
      setGenerationResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pm-engine/schedule'] });
    },
  });

  // Run PM automation mutation
  const runAutomationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pm-engine/run-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to run PM automation');
      return response.json();
    },
    onSuccess: (data) => {
      setGenerationResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pm-engine/schedule'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'due':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4" />;
      case 'due':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Preventive Maintenance Dashboard</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => generatePMsMutation.mutate()}
            disabled={generatePMsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Generate PM Work Orders
          </Button>
          <Button
            onClick={() => runAutomationMutation.mutate()}
            disabled={runAutomationMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Run PM Automation
          </Button>
        </div>
      </div>

      {generationResult && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {generationResult.success ? (
              `Successfully generated ${generationResult.generated} PM work orders`
            ) : (
              `PM generation failed: ${generationResult.errors?.join(', ')}`
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Equipment Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Selection</CardTitle>
            <CardDescription>Select equipment to view PM schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {equipment.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEquipmentId === item.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedEquipmentId(item.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.assetTag}</p>
                      <p className="text-sm text-gray-600">{item.model}</p>
                    </div>
                    <Badge variant="outline" className={`${item.status === 'active' ? 'border-green-500' : 'border-gray-500'}`}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PM Templates */}
        <Card>
          <CardHeader>
            <CardTitle>PM Templates</CardTitle>
            <CardDescription>Available preventive maintenance templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pmTemplates.map((template) => (
                <div key={template.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{template.model}</p>
                      <p className="text-sm text-gray-600">{template.component} - {template.action}</p>
                    </div>
                    <Badge variant="outline">{formatFrequency(template.frequency)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedEquipmentId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PM Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>PM Schedule</CardTitle>
              <CardDescription>Preventive maintenance schedule for selected equipment</CardDescription>
            </CardHeader>
            <CardContent>
              {pmSchedule.length === 0 ? (
                <p className="text-gray-500">No PM schedule available for this equipment</p>
              ) : (
                <div className="space-y-3">
                  {pmSchedule.map((schedule, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Next Due: {formatDate(schedule.nextDueDate)}</p>
                          <p className="text-sm text-gray-600">
                            Frequency: {formatFrequency(schedule.frequency)}
                          </p>
                          {schedule.lastCompletedDate && (
                            <p className="text-sm text-gray-600">
                              Last Completed: {formatDate(schedule.lastCompletedDate)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(schedule.complianceStatus)}>
                            {getStatusIcon(schedule.complianceStatus)}
                            {schedule.complianceStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>PM compliance metrics for selected equipment</CardDescription>
            </CardHeader>
            <CardContent>
              {compliance ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{compliance.compliancePercentage}%</div>
                    <p className="text-sm text-gray-600">Compliance Rate</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-semibold">{compliance.totalPMCount}</div>
                      <p className="text-sm text-gray-600">Total PMs</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-semibold text-red-600">{compliance.missedPMCount}</div>
                      <p className="text-sm text-gray-600">Missed PMs</p>
                    </div>
                  </div>

                  {compliance.lastPMDate && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Last PM Date</p>
                      <p className="font-semibold">{formatDate(compliance.lastPMDate)}</p>
                    </div>
                  )}

                  {compliance.nextPMDate && (
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-600">Next PM Date</p>
                      <p className="font-semibold">{formatDate(compliance.nextPMDate)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Loading compliance data...</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PMDashboard;
