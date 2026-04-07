import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy: React.FC = () => {
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
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          </div>

          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">1. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                At QGenesis, we collect information you provide directly to us, such as when you create an account, 
                upload materials, generate questions, or contact us for support. This includes your name, email address, 
                institution details, and any content you upload for question generation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">2. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide, maintain, and improve our AI-powered question generation services</li>
                <li>Process and analyze your uploaded materials to generate relevant questions</li>
                <li>Send you technical notices, updates, and security alerts</li>
                <li>Respond to your comments, questions, and support requests</li>
                <li>Monitor and analyze usage patterns to improve user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">3. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your personal information and uploaded 
                materials. All data is encrypted in transit and at rest. We regularly review and update our security 
                practices to ensure the highest level of protection for your academic content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">4. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information and generated content for as long as your account is active or 
                as needed to provide you services. You can request deletion of your data at any time through your 
                account settings or by contacting our support team.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">5. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access and receive a copy of your personal data</li>
                <li>Rectify inaccurate personal data</li>
                <li>Request deletion of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">6. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@qgenesis.com" className="text-qgenesis-blue hover:underline">
                  privacy@qgenesis.com
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
