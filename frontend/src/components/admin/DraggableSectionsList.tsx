import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface LandingSection {
  id: string;
  name: string;
  enabled: boolean;
}

interface DraggableSectionsListProps {
  sections: LandingSection[];
  onReorder: (sections: LandingSection[]) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

const DraggableSectionsList: React.FC<DraggableSectionsListProps> = ({
  sections,
  onReorder,
  onToggle,
}) => {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GripVertical className="w-5 h-5" />
          Landing Page Sections Order
        </CardTitle>
        <CardDescription>
          Drag and drop to reorder sections on the landing page. Toggle visibility for each section.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Reorder.Group
          axis="y"
          values={sections}
          onReorder={onReorder}
          className="space-y-2"
        >
          {sections.map((section) => (
            <Reorder.Item
              key={section.id}
              value={section}
              className="cursor-grab active:cursor-grabbing"
            >
              <motion.div
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  section.enabled
                    ? 'bg-muted/50 border-border'
                    : 'bg-muted/20 border-border/50 opacity-60'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                layout
              >
                <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1">
                  <p className="font-medium text-foreground">{section.name}</p>
                </div>

                <div className="flex items-center gap-2">
                  {section.enabled ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={(checked) => onToggle(section.id, checked)}
                  />
                </div>
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
        
        <p className="text-xs text-muted-foreground mt-4">
          Tip: Drag sections to change their display order on the landing page
        </p>
      </CardContent>
    </Card>
  );
};

export default DraggableSectionsList;
