import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RefreshCw, Settings, Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { format, addDays, isToday, isTomorrow, isWithinInterval, startOfDay } from 'date-fns';

interface PMSchedulerStatus {
  isRunning: boolean;
  nextRun?: Date;
  lastRun?: Date;
  generatedWorkOrders: number;
}

interface UpcomingPM {
  id: string;
  equipmentId: string;
  assetTag: string;
  model: string;
  component: string;
  action: string;
  dueDate: Date;
  status: 'due' | 'overdue' | 'upcoming';
  priority: 'high' | 'medium' | 'low';
}

export default function PMScheduler() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7'); // days
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedulerStatus, isLoading } = useQuery<PMSchedulerStatus>({
    queryKey: ['/api/pm-scheduler/status'],
    queryFn: async () => {
      const response = await fetch('/api/pm-scheduler/status');
      if (!response.ok) throw new Error('Failed to fetch scheduler status');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Mock upcoming PMs data - in production this would come from the API
  const { data: upcomingPMs = [] } = useQuery<UpcomingPM[]>({
    queryKey: ['/api/pm-scheduler/upcoming', selectedTimeRange],
    queryFn: async () => {
      // Mock data for demonstration
      const mockPMs: UpcomingPM[] = [
        {
          id: '1',
          equipmentId: 'eq1',
          assetTag: 'PUMP-001',
          model: 'Pump Model A',
          component: 'Oil Filter',
          action: 'Replace oil filter and check for leaks',
          dueDate: new Date(),
          status: 'overdue',
          priority: 'high',
        },
        {
          id: '2',
          equipmentId: 'eq2',
          assetTag: 'CONV-001',
          model: 'Conveyor System',
          component: 'Bearings',
          action: 'Lubricate bearings and check for wear',
          dueDate: addDays(new Date(), 1),
          status: 'due',
          priority: 'medium',
        },
        {
          id: '3',
          equipmentId: 'eq3',
          assetTag: 'PUMP-002',
          model: 'Pump Model A',
          component: 'Belt',
          action: 'Inspect belt tension and alignment',
          dueDate: addDays(new Date(), 3),
          status: 'upcoming',
          priority: 'medium',
        },
      ];
      return mockPMs;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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
      toast({ title: 'Success', description: 'PM scheduler started successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to start scheduler: ${error.message}`, variant: 'destructive' });
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
      toast({ title: 'Success', description: 'PM scheduler stopped successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to stop scheduler: ${error.message}`, variant: 'destructive' });
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
      toast({ title: 'Success', description: 'PM scheduler run completed' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to run scheduler: ${error.message}`, variant: 'destructive' });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'due': return 'text-yellow-600 bg-yellow-50';
      case 'upcoming': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'due': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'upcoming': return <Calendar className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const filteredPMs = upcomingPMs.filter(pm => {
    const rangeEnd = addDays(new Date(), parseInt(selectedTimeRange));
    return isWithinInterval(pm.dueDate, { start: startOfDay(new Date()), end: rangeEnd });
  });

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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Last Run:</span>
                <p className="font-medium">
                  {schedulerStatus?.lastRun ? format(new Date(schedulerStatus.lastRun), 'MMM d, h:mm a') : 'Never'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Next Run:</span>
                <p className="font-medium">
                  {schedulerStatus?.nextRun ? format(new Date(schedulerStatus.nextRun), 'MMM d, h:mm a') : 'Not scheduled'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Work Orders Generated:</span>
                <p className="font-medium">{schedulerStatus?.generatedWorkOrders || 0}</p>
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

      {/* Upcoming PMs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Upcoming Preventive Maintenance</span>
            </CardTitle>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="text-sm border rounded-md px-3 py-1"
            >
              <option value="7">Next 7 days</option>
              <option value="14">Next 14 days</option>
              <option value="30">Next 30 days</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPMs.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No upcoming PMs</h3>
                <p className="text-sm text-gray-600">All preventive maintenance is up to date for the selected time range.</p>
              </div>
            ) : (
              filteredPMs.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(pm.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{pm.assetTag}</h3>
                      <p className="text-sm text-gray-600">{pm.model} • {pm.component}</p>
                      <p className="text-sm text-gray-500">{pm.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(pm.status)} variant="secondary">
                      {pm.status}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{getDateDisplay(pm.dueDate)}</p>
                      <p className="text-xs text-gray-500">Due: {format(pm.dueDate, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Information */}
      <Card>
        <CardHeader>
          <CardTitle>How PM Scheduling Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Automatic Generation</h3>
                <p className="text-sm text-blue-800">
                  The scheduler runs every hour to check for equipment that needs preventive maintenance based on your templates and schedules.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Smart Scheduling</h3>
                <p className="text-sm text-green-800">
                  Work orders are created automatically when equipment becomes due, with priority levels based on criticality and overdue status.
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Process Overview</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Checks all active equipment against PM templates</li>
                <li>• Calculates next due dates based on frequency and last completion</li>
                <li>• Creates work orders for overdue or due equipment</li>
                <li>• Assigns priority levels (High for overdue, Medium for due, Low for upcoming)</li>
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
