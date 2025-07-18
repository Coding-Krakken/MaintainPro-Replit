import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import PMTemplateManager from './PMTemplateManager';
import PMComplianceDashboard from './PMComplianceDashboard';
import PMScheduler from './PMScheduler';

export default function PMManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Preventive Maintenance</h1>
        <p className="text-gray-600">
          Manage PM templates, monitor compliance, and automate preventive maintenance workflows
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Compliance Dashboard</TabsTrigger>
          <TabsTrigger value="templates">PM Templates</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
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
