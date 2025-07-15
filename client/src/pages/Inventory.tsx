import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Search, Plus, Package, AlertTriangle } from 'lucide-react';
import { useParts, useLowStockParts } from '../hooks/useInventory';
import { Part } from '../types';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: parts, isLoading } = useParts();
  const { data: lowStockParts } = useLowStockParts();

  const filteredParts = parts?.filter(part => {
    const matchesSearch = !searchQuery || 
      part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;

    return matchesSearch && matchesCategory;
  }) || [];

  const categories = Array.from(new Set(parts?.map(p => p.category).filter(Boolean))) || [];

  const getStockStatus = (part: Part) => {
    if (part.stockLevel <= 0) {
      return { status: 'out_of_stock', color: 'bg-red-100 text-red-800', text: 'Out of Stock' };
    } else if (part.stockLevel <= part.reorderPoint) {
      return { status: 'low_stock', color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' };
    } else {
      return { status: 'in_stock', color: 'bg-green-100 text-green-800', text: 'In Stock' };
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Inventory
          </h1>
          <p className="text-gray-600 mt-1">
            Manage parts and inventory levels
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Parts</p>
                <p className="text-3xl font-bold text-gray-900">{parts?.length || 0}</p>
              </div>
              <Package className="w-8 h-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-yellow-600">{lowStockParts?.length || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${parts?.reduce((sum, part) => 
                    sum + (parseFloat(part.unitCost || '0') * part.stockLevel), 0
                  ).toFixed(2) || '0.00'}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Parts Inventory ({filteredParts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse p-4 border rounded-lg">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? 'No parts found matching your criteria'
                  : 'No parts found'
                }
              </p>
              <Button>Add First Part</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Part Number</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Stock Level</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Unit Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.map((part) => {
                    const stockStatus = getStockStatus(part);
                    return (
                      <tr key={part.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {part.partNumber}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {part.description}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {part.category || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{part.stockLevel}</span>
                            <span className="text-gray-500 text-sm">
                              / {part.reorderPoint} min
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={stockStatus.color}>
                            {stockStatus.text}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          ${parseFloat(part.unitCost || '0').toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {part.location || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
