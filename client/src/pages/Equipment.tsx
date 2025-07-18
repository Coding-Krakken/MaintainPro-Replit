import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Search, QrCode, Plus, Settings } from 'lucide-react';
import { useEquipment } from '../hooks/useEquipment';
import { Equipment } from '../types';
import EquipmentDetailModal from '../components/equipment/EquipmentDetailModal';
import EquipmentFormModal from '../components/equipment/EquipmentFormModal';
import QRScanner from '../components/qr/QRScanner';

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: equipment, isLoading } = useEquipment();

  const filteredEquipment = equipment?.filter(item => {
    const matchesSearch = !searchQuery || 
      item.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCriticality = criticalityFilter === 'all' || item.criticality === criticalityFilter;

    return matchesSearch && matchesStatus && matchesCriticality;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleQRScan = (result: string) => {
    setShowQRScanner(false);
    const foundEquipment = equipment?.find(e => e.assetTag === result);
    if (foundEquipment) {
      setSelectedEquipment(foundEquipment.id);
    }
  };

  return (
    <>
      <div>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Equipment
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and track all equipment assets
            </p>
          </div>
          <div className="flex space-x-2 mt-4 sm:mt-0">
            <Button 
              variant="outline" 
              onClick={() => setShowQRScanner(true)}
              data-testid="qr-scan-button"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR
            </Button>
            <Button 
              data-testid="create-equipment-button"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>

              {/* Criticality Filter */}
              <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Criticality</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCriticalityFilter('all');
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))
          ) : filteredEquipment.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all' || criticalityFilter !== 'all'
                  ? 'No equipment found matching your criteria'
                  : 'No equipment found'
                }
              </p>
              <Button>Add Equipment</Button>
            </div>
          ) : (
            filteredEquipment.map((item) => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedEquipment(item.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      <Badge className={getCriticalityColor(item.criticality)}>
                        {item.criticality}
                      </Badge>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.assetTag}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {item.description}
                  </p>
                  
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span>{item.model}</span>
                    </div>
                    {item.area && (
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span>{item.area}</span>
                      </div>
                    )}
                    {item.manufacturer && (
                      <div className="flex justify-between">
                        <span>Manufacturer:</span>
                        <span>{item.manufacturer}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <EquipmentDetailModal
          isOpen={!!selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          equipmentId={selectedEquipment}
        />
      )}

      {/* Equipment Form Modal */}
      {showCreateModal && (
        <EquipmentFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />
      )}
    </>
  );
}
