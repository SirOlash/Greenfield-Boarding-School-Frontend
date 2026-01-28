import React from 'react';
import Navbar from '@/components/Navbar';
import RegistrationWizard from '@/components/registration/RegistrationWizard';

const Register: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <RegistrationWizard />
    </div>
  );
};

export default Register;
