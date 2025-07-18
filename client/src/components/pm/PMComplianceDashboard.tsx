import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { format, subDays, isAfter } from 'date-fns';

interface PMComplianceData {
  overallComplianceRate: number;
  totalPMsScheduled: number;
  totalPMsCompleted: number;
  overdueCount: number;
  equipmentCompliance: {
    equipmentId: string;
    assetTag: string;
    model: string;
    complianceRate: number;
    lastPMDate?: string;
    nextPMDate?: string;
    overdueCount: number;
  }[];
  monthlyTrends: {
    month: string;
    scheduled: number;
    completed: number;
    complianceRate: number;
  }[];
}

export default function PMComplianceDashboard() {
  const [timeRange, setTimeRange] = useState('30');
  const [equipmentFilter, setEquipmentFilter] = useState('all');

  const { data: complianceData, isLoading } = useQuery<PMComplianceData>({
    queryKey: ['/api/pm-compliance', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/pm-compliance?days=${timeRange}`, {
        headers: {
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch PM compliance data');
      return response.json();
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['/api/equipment'],
    queryFn: async () => {
      const response = await fetch('/api/equipment', {
        headers: {
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch equipment');
      return response.json();
    },
  });

  const getComplianceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceBadge = (rate: number) => {
    if (rate >= 95) return 'bg-green-100 text-green-800';
    if (rate >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const filteredEquipment = complianceData?.equipmentCompliance?.filter(eq => {
    if (equipmentFilter === 'all') return true;
    if (equipmentFilter === 'overdue') return eq.overdueCount > 0;
    if (equipmentFilter === 'compliant') return eq.complianceRate >= 95;
    if (equipmentFilter === 'at-risk') return eq.complianceRate < 85;
    return true;
  }) || [];

  const exportComplianceReport = () => {
    if (!complianceData) return;
    
    const csvContent = [
      ['Asset Tag', 'Model', 'Compliance Rate', 'Last PM Date', 'Next PM Date', 'Overdue Count'],
      ...complianceData.equipmentCompliance.map(eq => [
        eq.assetTag,
        eq.model,
        `${eq.complianceRate}%`,
        eq.lastPMDate ? format(new Date(eq.lastPMDate), 'yyyy-MM-dd') : 'Never',
        eq.nextPMDate ? format(new Date(eq.nextPMDate), 'yyyy-MM-dd') : 'TBD',
        eq.overdueCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pm-compliance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!complianceData) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">No PM Data Available</h3>
        <p className="text-sm text-gray-600">Set up PM templates to start tracking compliance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">PM Compliance Dashboard</h1>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportComplianceReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {complianceData.overallComplianceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 95%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PMs Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceData.totalPMsCompleted}
            </div>
            <p className="text-xs text-muted-foreground">
              of {complianceData.totalPMsScheduled} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue PMs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {complianceData.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Schedule</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceData.totalPMsScheduled - complianceData.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              PMs on track
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      {complianceData.monthlyTrends && complianceData.monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Compliance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complianceData.monthlyTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{trend.month}</span>
                      <span className={`text-sm ${getComplianceColor(trend.complianceRate)}`}>
                        {trend.complianceRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={trend.complianceRate} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {trend.completed} of {trend.scheduled} completed
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment Compliance */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Equipment Compliance</CardTitle>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  <SelectItem value="compliant">Compliant (≥95%)</SelectItem>
                  <SelectItem value="at-risk">At Risk (&lt;85%)</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEquipment.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No equipment found</h3>
                <p className="text-sm text-gray-600">No equipment matches the selected filter criteria.</p>
              </div>
            ) : (
              filteredEquipment.map((equipment) => (
                <div key={equipment.equipmentId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{equipment.assetTag}</h3>
                      <p className="text-sm text-gray-600">{equipment.model}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getComplianceBadge(equipment.complianceRate)}>
                        {equipment.complianceRate.toFixed(1)}%
                      </Badge>
                      {equipment.overdueCount > 0 && (
                        <Badge variant="destructive">
                          {equipment.overdueCount} overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Last PM:</span>
                      <span className="ml-2">
                        {equipment.lastPMDate 
                          ? format(new Date(equipment.lastPMDate), 'MMM d, yyyy')
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Next PM:</span>
                      <span className="ml-2">
                        {equipment.nextPMDate 
                          ? format(new Date(equipment.nextPMDate), 'MMM d, yyyy')
                          : 'TBD'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <Progress value={equipment.complianceRate} className="h-2" />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
