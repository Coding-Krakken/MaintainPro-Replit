import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import WorkOrderForm from './WorkOrderForm';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId?: string;
}

export default function WorkOrderModal({ isOpen, onClose, workOrderId }: WorkOrderModalProps) {
  const handleSuccess = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workOrderId ? 'Edit Work Order' : 'Create Work Order'}
          </DialogTitle>
        </DialogHeader>
        
        <WorkOrderForm
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
