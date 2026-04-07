import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export interface WatermarkConfig {
  enabled: boolean;
  type: 'draft' | 'confidential' | 'approved' | 'custom';
  customText: string;
  opacity: number;
  position: 'center' | 'diagonal' | 'top' | 'bottom';
  fontSize: 'small' | 'medium' | 'large';
}

interface WatermarkSettingsProps {
  config: WatermarkConfig;
  onChange: (config: WatermarkConfig) => void;
}

const WatermarkSettings: React.FC<WatermarkSettingsProps> = ({ config, onChange }) => {
  const updateConfig = (updates: Partial<WatermarkConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="watermark-enabled">Enable Watermark</Label>
        <Switch
          id="watermark-enabled"
          checked={config.enabled}
          onCheckedChange={(enabled) => updateConfig({ enabled })}
        />
      </div>

      {config.enabled && (
        <>
          <div className="space-y-2">
            <Label>Watermark Type</Label>
            <Select value={config.type} onValueChange={(type: WatermarkConfig['type']) => updateConfig({ type })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">DRAFT</SelectItem>
                <SelectItem value="confidential">CONFIDENTIAL</SelectItem>
                <SelectItem value="approved">APPROVED</SelectItem>
                <SelectItem value="custom">Custom Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.type === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Text</Label>
              <Input
                placeholder="Enter watermark text..."
                value={config.customText}
                onChange={(e) => updateConfig({ customText: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={config.position} onValueChange={(position: WatermarkConfig['position']) => updateConfig({ position })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="diagonal">Diagonal</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Font Size</Label>
            <Select value={config.fontSize} onValueChange={(fontSize: WatermarkConfig['fontSize']) => updateConfig({ fontSize })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Opacity: {config.opacity}%</Label>
            <Slider
              value={[config.opacity]}
              onValueChange={([opacity]) => updateConfig({ opacity })}
              min={10}
              max={50}
              step={5}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default WatermarkSettings;
