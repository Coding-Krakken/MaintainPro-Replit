import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Plus, Settings, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import PMTemplateManager from './PMTemplateManager';
import PMComplianceDashboard from './PMComplianceDashboard';
import PMScheduler from './PMScheduler';

export default function PMManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Quick stats for the overview
  const { data: quickStats } = useQuery({
    queryKey: ['/api/pm-compliance'],
    queryFn: async () => {
      const response = await fetch('/api/pm-compliance', {
        headers: {
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch PM compliance data');
      return response.json();
    },
  });

  const { data: templatesCount } = useQuery({
    queryKey: ['/api/pm-templates'],
    queryFn: async () => {
      const response = await fetch('/api/pm-templates', {
        headers: {
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch PM templates');
      const templates = await response.json();
      return templates.length;
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Preventive Maintenance</h1>
        <p className="text-gray-600">
          Manage PM templates, monitor compliance, and automate preventive maintenance workflows
        </p>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Compliance</p>
                <p className="text-2xl font-bold text-green-600">
                  {quickStats?.overallComplianceRate?.toFixed(1) || '0'}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue PMs</p>
                <p className="text-2xl font-bold text-red-600">
                  {quickStats?.overdueCount || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">PMs Completed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {quickStats?.totalPMsCompleted || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Templates</p>
                <p className="text-2xl font-bold text-purple-600">
                  {templatesCount || 0}
                </p>
              </div>
              <Settings className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">
            <CheckCircle className="w-4 h-4 mr-2" />
            Compliance Dashboard
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Settings className="w-4 h-4 mr-2" />
            PM Templates
          </TabsTrigger>
          <TabsTrigger value="scheduler">
            <Clock className="w-4 h-4 mr-2" />
            Scheduler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <PMComplianceDashboard />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <PMTemplateManager />
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <PMScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
}
