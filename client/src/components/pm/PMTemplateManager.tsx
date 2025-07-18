import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { PmTemplate } from '../../types';

interface PMTemplateFormData {
  model: string;
  component: string;
  action: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  estimatedDuration: number;
  description?: string;
  customFields?: Record<string, any>;
}

export default function PMTemplateManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PmTemplate | null>(null);
  const [formData, setFormData] = useState<PMTemplateFormData>({
    model: '',
    component: '',
    action: '',
    frequency: 'monthly',
    estimatedDuration: 60,
    description: '',
    customFields: {}
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<PmTemplate[]>({
    queryKey: ['/api/pm-templates'],
    queryFn: async () => {
      const response = await fetch('/api/pm-templates', {
        headers: {
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch PM templates');
      return response.json();
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: PMTemplateFormData) => {
      const response = await fetch('/api/pm-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create PM template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-templates'] });
      toast({
        title: 'Success',
        description: 'PM template created successfully',
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create PM template: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PMTemplateFormData }) => {
      const response = await fetch(`/api/pm-templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update PM template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-templates'] });
      toast({
        title: 'Success',
        description: 'PM template updated successfully',
      });
      setEditingTemplate(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update PM template: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pm-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to delete PM template');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-templates'] });
      toast({
        title: 'Success',
        description: 'PM template deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete PM template: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      model: '',
      component: '',
      action: '',
      frequency: 'monthly',
      estimatedDuration: 60,
      description: '',
      customFields: {}
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleEdit = (template: PmTemplate) => {
    setEditingTemplate(template);
    setFormData({
      model: template.model,
      component: template.component,
      action: template.action,
      frequency: template.frequency,
      estimatedDuration: template.estimatedDuration || 60,
      description: template.description || '',
      customFields: template.customFields || {}
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this PM template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'bg-red-100 text-red-800';
      case 'weekly': return 'bg-orange-100 text-orange-800';
      case 'monthly': return 'bg-blue-100 text-blue-800';
      case 'quarterly': return 'bg-green-100 text-green-800';
      case 'annually': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
        <h1 className="text-2xl font-bold text-gray-900">PM Template Manager</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingTemplate(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit PM Template' : 'Create PM Template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model">Equipment Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g., Conveyor Belt Model X"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="component">Component</Label>
                  <Input
                    id="component"
                    value={formData.component}
                    onChange={(e) => setFormData(prev => ({ ...prev, component: e.target.value }))}
                    placeholder="e.g., Motor, Belt, Bearing"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="action">Action</Label>
                <Input
                  id="action"
                  value={formData.action}
                  onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                  placeholder="e.g., Lubricate, Inspect, Replace"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about this maintenance task..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingTemplate(null);
                    resetForm();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-500 text-center">
                <Plus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No PM Templates</h3>
                <p className="text-sm">Create your first PM template to get started with preventive maintenance automation.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.model}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {template.component} • {template.action}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex space-x-4">
                    <Badge className={getFrequencyColor(template.frequency)}>
                      {template.frequency}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {template.estimatedDuration || 60} minutes
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Created {new Date(template.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
