import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import HeroSlider from '@/components/HeroSlider';

const features = [
  {
    icon: GraduationCap,
    title: 'Excellence in Education',
    description: 'World-class curriculum designed to nurture critical thinking and creativity.',
  },
  {
    icon: Users,
    title: 'Holistic Development',
    description: 'Balanced focus on academics, sports, arts, and character building.',
  },
  {
    icon: Shield,
    title: 'Safe Environment',
    description: 'Secure campus with 24/7 supervision and modern boarding facilities.',
  },
];

const benefits = [
  'Easy online registration process',
  'Flexible payment options including installments',
  'Secure virtual payment accounts',
  'Real-time payment tracking for parents',
  'SMS, Email & WhatsApp notifications',
];

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <HeroSlider />

      {/* CTA Section */}
      <div className="relative -mt-20 z-10">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Ready to Enroll Your Child?
              </h2>
              <p className="text-muted-foreground mt-1">
                Quick registration with flexible payment options
              </p>
            </div>
            <Link to="/register">
              <Button size="lg" className="shadow-button w-full md:w-auto">
                Enroll Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Why Choose <span className="text-gradient">Greenfield</span>?
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              We provide a nurturing environment where every student can thrive and reach their full potential.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-card rounded-2xl shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-greenfield-50 to-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Simplified Payment Experience
              </h2>
              <p className="text-muted-foreground mb-8">
                Our digital platform makes paying school fees easier than ever.
                Register your child and get a virtual account instantly.
              </p>

              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link to="/register" className="inline-block mt-8">
                <Button size="lg" className="shadow-button">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gradient-hero rounded-2xl p-8 text-primary-foreground">
                <div className="text-center">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-90" />
                  <h3 className="text-2xl font-bold mb-2">Join Our Community</h3>
                  <p className="opacity-90 mb-6">
                    Be part of the Greenfield family and give your child the education they deserve.
                  </p>
                  <div className="bg-primary-foreground/20 rounded-xl p-4">
                    <p className="text-sm opacity-80">Admission Open For</p>
                    <p className="text-xl font-bold">2025/2026 Session</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-900 text-primary-foreground py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Greenfield</span>
            </div>
            <p className="text-primary-foreground/70 text-center">
              © {new Date().getFullYear()} Greenfield Boarding School. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
