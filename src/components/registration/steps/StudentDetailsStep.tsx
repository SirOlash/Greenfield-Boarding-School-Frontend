import React, { useState, useEffect } from 'react';
import { GraduationCap, User, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RegistrationData } from '@/lib/registration';
import { validateStudentDetails } from '@/lib/registration';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { CLASS_GRADES, formatNaira, SCHOOL_FEES, type ClassGrade } from '@/lib/feeConfig';
import axiosInstance from '@/lib/axiosConfig';

interface Branch {
  id: number;
  businessName: string;
  address: string;
}

interface StudentDetailsStepProps {
  data: Partial<RegistrationData>;
  onUpdate: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  selectedFee: number;
  onBranchesLoaded: (ids: number[]) => void;
}

const StudentDetailsStep: React.FC<StudentDetailsStepProps> = ({
  data,
  onUpdate,
  onNext,
  selectedFee,
  onBranchesLoaded,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchError, setBranchError] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [retry, setRetry] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setLoadingBranches(true);
    setBranchError('');
    setBranches([]);
    onBranchesLoaded([]);
    axiosInstance.get<Branch[]>('/branches')
      .then((response) => {
        if (!active) return;
        setBranches(response.data);
        onBranchesLoaded(response.data.map((branch) => branch.id));
        if (!response.data.length) setBranchError('No school branches are available. Contact the school before registering.');
      })
      .catch((error: unknown) => {
        if (active) setBranchError(getApiErrorMessage(error, 'School branches could not be loaded. Retry before continuing.'));
      })
      .finally(() => { if (active) setLoadingBranches(false); });
    return () => { active = false; };
  }, [onBranchesLoaded, retry]);

  const validate = () => {
    const newErrors = validateStudentDetails(data, branches.map((branch) => branch.id));
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
          <GraduationCap className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Student Information</h2>
        <p className="text-muted-foreground mt-2">Enter the student's details to begin enrollment</p>
      </div>

      <div className="space-y-4">
        {/* Branch Selection */}
        <div className="space-y-2">
          <Label htmlFor="branch" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            School Branch
          </Label>
          <Select
            value={data.branchId ? data.branchId.toString() : ''}
            disabled={loadingBranches || !branches.length}
            onValueChange={(value) => onUpdate({ branchId: parseInt(value) })}
          >
            <SelectTrigger id="branch" className={errors.branchId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.businessName} - {branch.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {branchError && <p role="alert" className="text-sm text-destructive">{branchError}</p>}
          {branchError && <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>Retry branches</Button>}
          {errors.branchId && <p className="text-xs text-destructive">{errors.branchId}</p>}
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              First Name
            </Label>
            <Input
              id="firstName"
              value={data.firstName || ''}
              onChange={(e) => onUpdate({ firstName: e.target.value })}
              placeholder="Enter first name"
              className={errors.firstName ? 'border-destructive' : ''}
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="surname">Surname</Label>
            <Input
              id="surname"
              value={data.surname || ''}
              onChange={(e) => onUpdate({ surname: e.target.value })}
              placeholder="Enter surname"
              className={errors.surname ? 'border-destructive' : ''}
            />
            {errors.surname && <p className="text-xs text-destructive">{errors.surname}</p>}
          </div>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dob" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date of Birth
          </Label>
          <Input
            id="dob"
            type="date"
            value={data.dateOfBirth || ''}
            onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
            className={errors.dateOfBirth ? 'border-destructive' : ''}
          />
          {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
        </div>

        {/* Class Selection */}
        <div className="space-y-2">
          <Label htmlFor="class" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Class / Grade
          </Label>
          <Select
            value={data.classGrade}
            onValueChange={(value: ClassGrade) => onUpdate({ classGrade: value })}
          >
            <SelectTrigger className={errors.classGrade ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASS_GRADES.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade} - {formatNaira(SCHOOL_FEES[grade])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.classGrade && <p className="text-xs text-destructive">{errors.classGrade}</p>}
        </div>

        {/* Fee Display */}
        {selectedFee > 0 && (
          <div className="p-4 bg-secondary rounded-xl border border-primary/20">
            <p className="text-sm text-muted-foreground">Synthetic fee preview for {data.classGrade}</p>
            <p className="text-2xl font-bold text-primary">{formatNaira(selectedFee)}</p>
            <p className="text-xs text-muted-foreground mt-1">The backend sets the final fee and returns the invoice terms.</p>
          </div>
        )}
      </div>

      <Button onClick={handleNext} disabled={loadingBranches || !branches.length} className="w-full shadow-button">
        Continue to Parent Details
      </Button>
    </div>
  );
};

export default StudentDetailsStep;
