import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-8 hover:bg-primary/10 text-foreground border-border"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-qgenesis-blue to-qgenesis-cyan">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          </div>

          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using QGenesis, you agree to be bound by these Terms of Service. If you disagree 
                with any part of these terms, you may not access the service. These terms apply to all users, 
                including staff, heads of department, and administrators.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                QGenesis is an AI-powered question bank generation platform designed for educational institutions. 
                Our service allows users to upload study materials and automatically generate high-quality assessment 
                questions aligned with Bloom's Taxonomy and academic standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">3. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you create an account with us, you must provide accurate and complete information. You are 
                responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Ensuring your use complies with your institution's policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">4. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of all materials you upload to QGenesis. By uploading content, you grant us 
                a limited license to process your materials solely for the purpose of generating questions. 
                Generated questions belong to your institution and can be used for academic purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">5. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Upload copyrighted materials without proper authorization</li>
                <li>Use the service for any unlawful purpose</li>
                <li>Attempt to reverse engineer the AI algorithms</li>
                <li>Share your account credentials with unauthorized users</li>
                <li>Upload malicious content or attempt to compromise system security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">6. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to provide reliable service but do not guarantee uninterrupted access. We may suspend 
                or terminate access for maintenance, security updates, or violation of these terms. We will 
                provide reasonable notice when possible.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">7. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                QGenesis is provided "as is" without warranties of any kind. We are not liable for any indirect, 
                incidental, or consequential damages arising from your use of the service. Users should review 
                generated questions for accuracy before use in assessments.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">8. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:legal@qgenesis.com" className="text-qgenesis-blue hover:underline">
                  legal@qgenesis.com
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;
