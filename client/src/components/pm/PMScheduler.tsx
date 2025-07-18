import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RefreshCw, Settings, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

interface PMSchedulerStatus {
  isRunning: boolean;
  nextRun?: Date;
}

export default function PMScheduler() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: schedulerStatus, isLoading } = useQuery<PMSchedulerStatus>({
    queryKey: ['/api/pm-scheduler/status'],
    queryFn: async () => {
      const response = await fetch('/api/pm-scheduler/status');
      if (!response.ok) throw new Error('Failed to fetch scheduler status');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const startSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pm-scheduler/start', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start scheduler');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-scheduler/status'] });
      toast({
        title: 'Success',
        description: 'PM scheduler started successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to start scheduler: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const stopSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pm-scheduler/stop', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to stop scheduler');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-scheduler/status'] });
      toast({
        title: 'Success',
        description: 'PM scheduler stopped successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to stop scheduler: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const runSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pm-scheduler/run', {
        method: 'POST',
        headers: {
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to run scheduler');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-compliance'] });
      toast({
        title: 'Success',
        description: 'PM scheduler run completed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to run scheduler: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleToggleScheduler = () => {
    if (schedulerStatus?.isRunning) {
      stopSchedulerMutation.mutate();
    } else {
      startSchedulerMutation.mutate();
    }
  };

  const handleManualRun = () => {
    runSchedulerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">PM Scheduler</h1>
        <Button
          onClick={handleManualRun}
          disabled={runSchedulerMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${runSchedulerMutation.isPending ? 'animate-spin' : ''}`} />
          Run Now
        </Button>
      </div>

      {/* Scheduler Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Scheduler Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Label htmlFor="scheduler-toggle" className="text-sm font-medium">
                  Automatic PM Generation
                </Label>
                <Badge variant={schedulerStatus?.isRunning ? 'default' : 'secondary'}>
                  {schedulerStatus?.isRunning ? 'Running' : 'Stopped'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="scheduler-toggle"
                  checked={schedulerStatus?.isRunning}
                  onCheckedChange={handleToggleScheduler}
                  disabled={startSchedulerMutation.isPending || stopSchedulerMutation.isPending}
                />
                {schedulerStatus?.isRunning ? (
                  <Pause className="w-4 h-4 text-gray-500" />
                ) : (
                  <Play className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>The PM scheduler automatically generates preventive maintenance work orders based on your templates and equipment schedules.</p>
              {schedulerStatus?.isRunning && (
                <p className="mt-2 flex items-center text-green-600">
                  <Clock className="w-4 h-4 mr-1" />
                  Runs every hour to check for due PMs
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Information */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Frequency</h3>
                <p className="text-sm text-gray-600">
                  The scheduler runs every hour to check for equipment that needs preventive maintenance
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Work Order Generation</h3>
                <p className="text-sm text-gray-600">
                  PM work orders are automatically created when equipment becomes due for maintenance
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Checks all active equipment against PM templates</li>
                <li>• Calculates next due dates based on frequency and last completion</li>
                <li>• Creates work orders for overdue or due equipment</li>
                <li>• Sends notifications to supervisors and managers</li>
                <li>• Tracks compliance and generates reports</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Run PM Generation Now</h3>
                <p className="text-sm text-gray-600">
                  Manually trigger PM work order generation for all equipment
                </p>
              </div>
              <Button
                onClick={handleManualRun}
                disabled={runSchedulerMutation.isPending}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${runSchedulerMutation.isPending ? 'animate-spin' : ''}`} />
                {runSchedulerMutation.isPending ? 'Running...' : 'Run Now'}
              </Button>
            </div>

            <div className="text-sm text-gray-600 bg-yellow-50 p-4 rounded-lg">
              <p className="font-medium text-yellow-800 mb-1">Note:</p>
              <p className="text-yellow-700">
                Manual runs will only generate work orders for equipment that doesn't already have active PM work orders.
                This prevents duplicate work orders from being created.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
