import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatNaira } from '@/lib/feeConfig';
import axiosInstance from '@/lib/axiosConfig';
import { Loader2, Plus } from 'lucide-react';

interface CreatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: number;
    studentName: string;
    onSuccess: () => void;
}

const CATEGORIES = [
    { value: 'BOOKS', label: 'Books' },
    { value: 'UNIFORM', label: 'Uniform' },
    { value: 'EXCURSION', label: 'Excursion' },
    { value: 'STATIONERY', label: 'Stationery' },
    { value: 'SPORTS', label: 'Sports Gear' },
    { value: 'OTHER', label: 'Other Item' },
];

const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({
    isOpen,
    onClose,
    studentId,
    studentName,
    onSuccess
}) => {
    const [category, setCategory] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!category) return;

        setIsSubmitting(true);
        try {
            const selectedCategory = CATEGORIES.find(c => c.value === category);
            await axiosInstance.post('/payments/new', {
                studentId,
                category: 'ADHOC_PAYMENT',
                amount: 300,
                paymentType: 'SINGLE_PAYMENT',
                description: selectedCategory?.label || 'Ad-hoc Payment'
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create payment', error);
            alert('Failed to create payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Payment</DialogTitle>
                    <DialogDescription>
                        Create an ad-hoc payment for <strong>{studentName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Select Item/Category</Label>
                        <Select onValueChange={setCategory} value={category}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="What is this payment for?" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="p-4 bg-muted rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Fixed Amount</p>
                            <p className="text-xl font-bold text-primary">{formatNaira(300)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Payment Type</p>
                            <p className="font-medium">Single Payment</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!category || isSubmitting}
                        className="gap-2"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Generate Invoice
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreatePaymentModal;
