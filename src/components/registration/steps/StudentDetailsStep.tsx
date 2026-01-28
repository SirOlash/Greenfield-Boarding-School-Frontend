import React, { useState, useEffect } from 'react';
import { GraduationCap, User, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegistrationData } from '../RegistrationWizard';
import { CLASS_GRADES, formatNaira, SCHOOL_FEES } from '@/lib/feeConfig';
import axiosInstance from '@/lib/axiosConfig';

interface Branch {
  id: number;
  businessName: string;
  address: string;
}

// Hardcoded branch for demo - will be replaced when real branches are created
const DEMO_BRANCHES: Branch[] = [
  { id: 1, businessName: 'Greenfield Main Campus', address: 'Victoria Island, Lagos' },
];

interface StudentDetailsStepProps {
  data: Partial<RegistrationData>;
  onUpdate: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  selectedFee: number;
}

const StudentDetailsStep: React.FC<StudentDetailsStepProps> = ({
  data,
  onUpdate,
  onNext,
  selectedFee,
}) => {
  const [branches, setBranches] = useState<Branch[]>(DEMO_BRANCHES);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch branches from API
    const fetchBranches = async () => {
      try {
        const response = await axiosInstance.get<Branch[]>('/branches');
        if (response.data.length > 0) {
          setBranches(response.data);
        }
      } catch (error) {
        // Use demo branches if API fails
        console.log('Using demo branches');
      }
    };
    fetchBranches();
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.branchId) newErrors.branchId = 'Please select a branch';
    if (!data.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!data.surname?.trim()) newErrors.surname = 'Surname is required';
    if (!data.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!data.classGrade) newErrors.classGrade = 'Please select a class';

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
            value={data.branchId?.toString()}
            onValueChange={(value) => onUpdate({ branchId: parseInt(value) })}
          >
            <SelectTrigger className={errors.branchId ? 'border-destructive' : ''}>
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
            onValueChange={(value) => onUpdate({ classGrade: value })}
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
            <p className="text-sm text-muted-foreground">School Fee for {data.classGrade}</p>
            <p className="text-2xl font-bold text-primary">{formatNaira(selectedFee)}</p>
          </div>
        )}
      </div>

      <Button onClick={handleNext} className="w-full shadow-button">
        Continue to Parent Details
      </Button>
    </div>
  );
};

export default StudentDetailsStep;
