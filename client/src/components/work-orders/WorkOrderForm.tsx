import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useCreateWorkOrder } from '../../hooks/useWorkOrders';
import { useEquipment } from '../../hooks/useEquipment';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';
import { QrCode, Upload } from 'lucide-react';
import { useState } from 'react';
import QRScanner from '../qr/QRScanner';
import FileUpload from '../FileUpload';

const workOrderSchema = z.object({
  foNumber: z.string().min(1, 'FO Number is required'),
  type: z.enum(['corrective', 'preventive', 'emergency']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  area: z.string().optional(),
  assetModel: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  equipmentId: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
  notes: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface WorkOrderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<WorkOrderFormData>;
}

export default function WorkOrderForm({ onSuccess, onCancel, initialData }: WorkOrderFormProps) {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const createWorkOrder = useCreateWorkOrder();
  const { data: equipment } = useEquipment();

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      foNumber: `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      type: 'corrective',
      priority: 'medium',
      ...initialData,
    },
  });

  const onSubmit = async (data: WorkOrderFormData) => {
    try {
      await createWorkOrder.mutateAsync({
        ...data,
        requestedBy: user!.id,
        warehouseId: user!.warehouseId,
        status: 'new',
        escalated: false,
        escalationLevel: 0,
        followUp: false,
      });

      toast({
        title: 'Success',
        description: 'Work order created successfully',
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create work order',
        variant: 'destructive',
      });
    }
  };

  const handleQRScan = (result: string) => {
    setShowQRScanner(false);
    
    // Find equipment by asset tag
    const foundEquipment = equipment?.find(e => e.assetTag === result);
    if (foundEquipment) {
      form.setValue('equipmentId', foundEquipment.id);
      form.setValue('assetModel', foundEquipment.model);
      form.setValue('area', foundEquipment.area || '');
      
      toast({
        title: 'Equipment Found',
        description: `Linked to ${foundEquipment.assetTag} - ${foundEquipment.description}`,
      });
    } else {
      toast({
        title: 'Equipment Not Found',
        description: `No equipment found with asset tag: ${result}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* FO Number */}
          <FormField
            control={form.control}
            name="foNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>FO Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., WO-2024-001"
                    data-testid="fo-number-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Equipment Selection with QR Scanner */}
          <FormField
            control={form.control}
            name="equipmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment</FormLabel>
                <div className="flex space-x-2">
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select equipment or scan QR code" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.assetTag} - {item.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQRScanner(true)}
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the issue or maintenance required..."
                    rows={3}
                    data-testid="description-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrective">Corrective</SelectItem>
                        <SelectItem value="preventive">Preventive</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Area and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Warehouse A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Estimated Hours */}
          <FormField
            control={form.control}
            name="estimatedHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.25" placeholder="4.5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Additional Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional information..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* File Upload Section */}
          <div>
            <FormLabel>Attachments</FormLabel>
            <FileUpload
              workOrderId={initialData?.equipmentId} // Will be updated after work order creation
              onUploadSuccess={(fileUrl, fileName) => {
                toast({
                  title: 'File Uploaded',
                  description: `${fileName} uploaded successfully`,
                });
              }}
              onUploadError={(error) => {
                toast({
                  title: 'Upload Failed',
                  description: error,
                  variant: 'destructive',
                });
              }}
              maxFiles={5}
              className="mt-2"
            />
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createWorkOrder.isPending}
            >
              {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
            </Button>
          </div>
        </form>
      </Form>

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
