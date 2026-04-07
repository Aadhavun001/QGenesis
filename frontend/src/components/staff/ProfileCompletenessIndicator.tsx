import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle, 
  Building2, 
  MapPin, 
  Building,
  UserCog,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileField {
  key: 'department' | 'institution' | 'place';
  label: string;
  icon: React.ElementType;
  value: string | undefined;
}

const ProfileCompletenessIndicator: React.FC = () => {
  const { user } = useAuth();

  const profileFields: ProfileField[] = [
    { key: 'department', label: 'Department', icon: Building2, value: user?.department },
    { key: 'institution', label: 'Institution', icon: Building, value: user?.institution },
    { key: 'place', label: 'Place/Location', icon: MapPin, value: user?.place },
  ];

  const completedFields = profileFields.filter(f => f.value && f.value.trim() !== '');
  const completionPercentage = (completedFields.length / profileFields.length) * 100;
  const isComplete = completedFields.length === profileFields.length;

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Profile Complete
                </p>
                <p className="text-xs text-muted-foreground">
                  You're all set to create and manage question papers
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                Ready
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <motion.div 
              className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Complete Your Profile
              </p>
              <p className="text-xs text-muted-foreground">
                Some information is missing. Please update your profile before creating papers.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Profile Completion</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {completedFields.length}/{profileFields.length} fields
              </span>
            </div>
            <Progress 
              value={completionPercentage} 
              className="h-2 bg-amber-500/20"
            />
          </div>

          {/* Field Status */}
          <div className="grid gap-2">
            {profileFields.map((field) => {
              const isSet = field.value && field.value.trim() !== '';
              const Icon = field.icon;
              
              return (
                <div 
                  key={field.key}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isSet 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-destructive/10 border border-destructive/20'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSet ? 'text-green-500' : 'text-destructive'}`} />
                  <span className="flex-1 text-sm">
                    {field.label}
                  </span>
                  {isSet ? (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                      {field.value}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                      Not Set
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <Link to="/staff/settings">
            <Button 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <UserCog className="w-4 h-4 mr-2" />
              Update Profile Settings
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProfileCompletenessIndicator;
