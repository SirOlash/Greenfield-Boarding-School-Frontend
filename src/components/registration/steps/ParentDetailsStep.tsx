import React, { useState } from 'react';
import { Users, Mail, Phone, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegistrationData } from '../RegistrationWizard';

interface ParentDetailsStepProps {
  data: Partial<RegistrationData>;
  onUpdate: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TITLES = ['MR', 'MRS', 'MS', 'DR', 'CHIEF', 'ENGR', 'PROF', 'BARR'];

const ParentDetailsStep: React.FC<ParentDetailsStepProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    // Nigerian phone number validation
    const re = /^(0[789][01]\d{8}|234[789][01]\d{8})$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!data.parentTitle) newErrors.parentTitle = 'Title is required';
    if (!data.parentFirstName?.trim()) newErrors.parentFirstName = 'First name is required';
    if (!data.parentSurname?.trim()) newErrors.parentSurname = 'Surname is required';

    if (!data.parentEmail?.trim()) {
      newErrors.parentEmail = 'Email is required';
    } else if (!validateEmail(data.parentEmail)) {
      newErrors.parentEmail = 'Please enter a valid email';
    }

    if (!data.parentPhoneNumber?.trim()) {
      newErrors.parentPhoneNumber = 'Phone number is required';
    } else if (!validatePhone(data.parentPhoneNumber)) {
      newErrors.parentPhoneNumber = 'Please enter a valid Nigerian phone number';
    }

    if (!data.parentPassword || data.parentPassword.length < 8) {
      newErrors.parentPassword = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Parent / Guardian Details</h2>
        <p className="text-muted-foreground mt-2">Contact information for account access and notifications</p>
      </div>

      <div className="space-y-4">
        {/* Title & Names Row */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 space-y-2">
            <Label>Title</Label>
            <Select
              value={data.parentTitle}
              onValueChange={(value) => onUpdate({ parentTitle: value })}
            >
              <SelectTrigger className={errors.parentTitle ? 'border-destructive' : ''}>
                <SelectValue placeholder="Title" />
              </SelectTrigger>
              <SelectContent>
                {TITLES.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.parentTitle && <p className="text-xs text-destructive">{errors.parentTitle}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              First Name
            </Label>
            <Input
              id="firstName"
              value={data.parentFirstName || ''}
              onChange={(e) => onUpdate({ parentFirstName: e.target.value })}
              placeholder="e.g. John"
              className={errors.parentFirstName ? 'border-destructive' : ''}
            />
            {errors.parentFirstName && <p className="text-xs text-destructive">{errors.parentFirstName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="surname" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Surname
            </Label>
            <Input
              id="surname"
              value={data.parentSurname || ''}
              onChange={(e) => onUpdate({ parentSurname: e.target.value })}
              placeholder="e.g. Doe"
              className={errors.parentSurname ? 'border-destructive' : ''}
            />
            {errors.parentSurname && <p className="text-xs text-destructive">{errors.parentSurname}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={data.parentEmail || ''}
            onChange={(e) => onUpdate({ parentEmail: e.target.value })}
            placeholder="parent@example.com"
            className={errors.parentEmail ? 'border-destructive' : ''}
          />
          {errors.parentEmail && <p className="text-xs text-destructive">{errors.parentEmail}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={data.parentPassword || ''}
            onChange={(e) => onUpdate({ parentPassword: e.target.value })}
            placeholder="Create a password"
            className={errors.parentPassword ? 'border-destructive' : ''}
          />
          {errors.parentPassword && <p className="text-xs text-destructive">{errors.parentPassword}</p>}
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={data.parentPhoneNumber || ''}
            onChange={(e) => onUpdate({ parentPhoneNumber: e.target.value })}
            placeholder="08012345678"
            className={errors.parentPhoneNumber ? 'border-destructive' : ''}
          />
          {errors.parentPhoneNumber && (
            <p className="text-xs text-destructive">{errors.parentPhoneNumber}</p>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-greenfield-50 rounded-xl border border-greenfield-200">
          <p className="text-sm text-foreground">
            <strong>Note:</strong> Payment details will be sent to your email, SMS, and WhatsApp.
            Make sure the contact information is correct.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1 shadow-button">
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default ParentDetailsStep;
