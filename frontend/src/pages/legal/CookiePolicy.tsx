import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cookie } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CookiePolicy: React.FC = () => {
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
              <Cookie className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Cookie Policy</h1>
          </div>

          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">1. What Are Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cookies are small text files that are placed on your computer or mobile device when you visit 
                our website. They are widely used to make websites work more efficiently and provide useful 
                information to website owners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">2. How We Use Cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                QGenesis uses cookies for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly, including user authentication and session management</li>
                <li><strong>Preference Cookies:</strong> Remember your settings like theme preference (light/dark mode) and language</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website to improve user experience</li>
                <li><strong>Security Cookies:</strong> Help protect your account and detect suspicious activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">3. Types of Cookies We Use</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-muted-foreground">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 pr-4 font-semibold text-foreground">Cookie Name</th>
                      <th className="text-left py-3 pr-4 font-semibold text-foreground">Purpose</th>
                      <th className="text-left py-3 font-semibold text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-3 pr-4">session_id</td>
                      <td className="py-3 pr-4">User authentication</td>
                      <td className="py-3">Session</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 pr-4">theme_preference</td>
                      <td className="py-3 pr-4">Stores light/dark mode preference</td>
                      <td className="py-3">1 year</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 pr-4">analytics_id</td>
                      <td className="py-3 pr-4">Analytics and usage tracking</td>
                      <td className="py-3">2 years</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">csrf_token</td>
                      <td className="py-3 pr-4">Security protection</td>
                      <td className="py-3">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">4. Managing Cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You can control and manage cookies in several ways:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Browser settings: Most browsers allow you to refuse or delete cookies</li>
                <li>Our cookie banner: When you first visit, you can choose which cookies to accept</li>
                <li>Account settings: Manage your preferences within your QGenesis account</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Please note that disabling essential cookies may prevent you from using certain features of our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">5. Third-Party Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may use third-party analytics services that set their own cookies. These help us understand 
                how our service is used and identify areas for improvement. Third-party providers have their 
                own privacy policies governing their use of cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">6. Updates to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Cookie Policy from time to time. Any changes will be posted on this page 
                with an updated revision date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-qgenesis-blue">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about our use of cookies, please contact us at{' '}
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

export default CookiePolicy;
