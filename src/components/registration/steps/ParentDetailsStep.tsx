import React, { useState } from 'react';
import { Users, Mail, Phone, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RegistrationData } from '@/lib/registration';
import { validateParentDetails } from '@/lib/registration';
import type { Title } from '@/types/payment-api';

interface ParentDetailsStepProps {
  data: Partial<RegistrationData>;
  onUpdate: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
  existingParent: boolean;
}

const TITLES: Title[] = ['MR', 'MRS', 'MS', 'DR', 'CHIEF', 'ENGR', 'PROF', 'BARR'];

const ParentDetailsStep: React.FC<ParentDetailsStepProps> = ({
  data, onUpdate, onNext, onBack, existingParent,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleNext = () => {
    const validation = validateParentDetails(data, existingParent);
    setErrors(validation);
    if (!Object.keys(validation).length) onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Parent / Guardian Details</h2>
        <p className="text-muted-foreground mt-2">
          {existingParent ? 'Confirm the details for your signed-in parent account' : 'Create your demonstration parent account'}
        </p>
      </div>
      {existingParent && (
        <p className="p-4 bg-secondary rounded-xl text-sm">
          Your saved parent profile will be reused. Enter the phone number already on your account exactly;
          registration does not change your profile or banking details.
        </p>
      )}
      <div className="space-y-4">
        {!existingParent && (
          <div className="space-y-2">
            <Label htmlFor="parentTitle">Title</Label>
            <Select value={data.parentTitle} onValueChange={(value: Title) => onUpdate({ parentTitle: value })}>
              <SelectTrigger id="parentTitle" className={errors.parentTitle ? 'border-destructive' : ''}>
                <SelectValue placeholder="Title" />
              </SelectTrigger>
              <SelectContent>{TITLES.map((title) => <SelectItem key={title} value={title}>{title}</SelectItem>)}</SelectContent>
            </Select>
            {errors.parentTitle && <p className="text-xs text-destructive">{errors.parentTitle}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="parentFirstName" className="flex items-center gap-2"><User className="w-4 h-4" />First Name</Label>
            <Input id="parentFirstName" value={data.parentFirstName || ''} maxLength={255}
              onChange={(event) => onUpdate({ parentFirstName: event.target.value })}
              placeholder="Parent first name" className={errors.parentFirstName ? 'border-destructive' : ''} />
            {errors.parentFirstName && <p className="text-xs text-destructive">{errors.parentFirstName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentSurname">Surname</Label>
            <Input id="parentSurname" value={data.parentSurname || ''} maxLength={255}
              onChange={(event) => onUpdate({ parentSurname: event.target.value })}
              placeholder="Parent surname" className={errors.parentSurname ? 'border-destructive' : ''} />
            {errors.parentSurname && <p className="text-xs text-destructive">{errors.parentSurname}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentEmail" className="flex items-center gap-2"><Mail className="w-4 h-4" />Email Address</Label>
          <Input id="parentEmail" type="email" value={data.parentEmail || ''} readOnly={existingParent}
            maxLength={255} onChange={(event) => onUpdate({ parentEmail: event.target.value })}
            placeholder="parent@example.invalid" className={errors.parentEmail ? 'border-destructive' : ''} />
          {existingParent && <p className="text-xs text-muted-foreground">Bound to the authenticated parent account.</p>}
          {errors.parentEmail && <p className="text-xs text-destructive">{errors.parentEmail}</p>}
        </div>
        {!existingParent && (
          <div className="space-y-2">
            <Label htmlFor="parentPassword">Password</Label>
            <Input id="parentPassword" type="password" autoComplete="new-password"
              value={data.parentPassword || ''} onChange={(event) => onUpdate({ parentPassword: event.target.value })}
              placeholder="Create a private password" className={errors.parentPassword ? 'border-destructive' : ''} />
            {errors.parentPassword && <p className="text-xs text-destructive">{errors.parentPassword}</p>}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="parentPhoneNumber" className="flex items-center gap-2"><Phone className="w-4 h-4" />Phone Number</Label>
          <Input id="parentPhoneNumber" type="tel" maxLength={255} value={data.parentPhoneNumber || ''}
            onChange={(event) => onUpdate({ parentPhoneNumber: event.target.value })}
            placeholder={existingParent ? 'Phone number saved on your account' : 'Demonstration phone number'}
            className={errors.parentPhoneNumber ? 'border-destructive' : ''} />
          {errors.parentPhoneNumber && <p className="text-xs text-destructive">{errors.parentPhoneNumber}</p>}
        </div>
        <div className="p-4 bg-greenfield-50 rounded-xl border border-greenfield-200 text-sm">
          Use synthetic personal details for this offline demonstration. Registration creates a student and mock invoice;
          it does not confirm a payment or send real financial instructions.
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Button onClick={handleNext} className="flex-1 shadow-button">Continue to Payment</Button>
      </div>
    </div>
  );
};

export default ParentDetailsStep;
