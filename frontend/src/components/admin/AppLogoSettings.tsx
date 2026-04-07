import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Image as ImageIcon, 
  Upload, 
  Type, 
  Save, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
  Palette,
  Eye,
  Trash2,
  SplitSquareHorizontal,
  Square,
  Circle,
  RectangleHorizontal,
  Eraser,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import qgenesisLogo from '@/assets/qgenesis-logo.png';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestoreLogoSettingsService } from '@/services/firebase/firestore-database';
import { firestoreStorageService, STORAGE_PATHS } from '@/services/firebase/firestore-storage';

function updateFavicon(href: string) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (link) link.href = href;
  if (apple) apple.href = href;
}

async function updateFaviconFromLogo(settings: LogoSettings & { type: 'image' | 'text' }) {
  // Only generate a shaped favicon for image logos. Text logos fall back to default.
  if (settings.type !== 'image' || !settings.imageUrl) {
    updateFavicon('/favicon.png');
    return;
  }

  // If not circle, use the raw image URL.
  if (settings.shape !== 'circle') {
    updateFavicon(settings.imageUrl);
    return;
  }

  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = settings.imageUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Favicon image load failed'));
    });

    // Cover-crop to square
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;

    // Circle clip
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Apply same filters as logo preview
    ctx.filter = `brightness(${settings.brightness || 100}%) contrast(${settings.contrast || 100}%) saturate(${settings.saturate || 100}%) hue-rotate(${settings.hueRotate || 0}deg)`;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');
    updateFavicon(dataUrl);
  } catch (e) {
    console.warn('[AppLogoSettings] Could not generate shaped favicon:', e);
    updateFavicon(settings.imageUrl);
  }
}

interface LogoSettings {
  type: 'image' | 'text';
  imageUrl: string;
  text: string;
  letterColors: string[];
  zoom: number;
  positionX: number;
  positionY: number;
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  shape: 'square' | 'circle' | 'rounded';
  removeBackground: boolean;
  font: string;
}

// Professional fonts list
const FONT_OPTIONS = [
  { value: 'font-orbitron', label: 'Orbitron (Default)', family: "'Orbitron', sans-serif" },
  { value: 'font-sans', label: 'Sans Serif', family: 'ui-sans-serif, system-ui, sans-serif' },
  { value: 'font-serif', label: 'Serif', family: 'ui-serif, Georgia, serif' },
  { value: 'font-mono', label: 'Monospace', family: 'ui-monospace, monospace' },
  { value: 'font-poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { value: 'font-playfair', label: 'Playfair Display', family: "'Playfair Display', serif" },
  { value: 'font-roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { value: 'font-montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
];

const DEFAULT_SETTINGS: LogoSettings = {
  type: 'image',
  imageUrl: qgenesisLogo,
  text: 'QGenesis',
  letterColors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'],
  zoom: 100,
  positionX: 0,
  positionY: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  shape: 'square',
  removeBackground: false,
  font: 'font-orbitron',
};

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const type = blob.type || 'image/png';
  return new File([blob], fileName, { type });
}

const AppLogoSettings: React.FC = () => {
  const [settings, setSettings] = useState<LogoSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<LogoSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewMode, setPreviewMode] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load settings from Firestore (when configured) or localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isFirebaseConfigured()) {
        const remote = await firestoreLogoSettingsService.get();
        if (mounted && remote && typeof remote === 'object') {
          const parsed = { ...DEFAULT_SETTINGS, ...remote } as LogoSettings;
          setSettings(parsed);
          setOriginalSettings(parsed);
          setActiveTab((parsed.type as 'image' | 'text') || 'image');
          if (parsed.type === 'image' && parsed.imageUrl) updateFavicon(parsed.imageUrl);
          return;
        }
      }
      const stored = localStorage.getItem('qgenesis-logo-settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (mounted) {
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            setOriginalSettings({ ...DEFAULT_SETTINGS, ...parsed });
            setActiveTab(parsed.type || 'image');
            if (parsed.type === 'image' && parsed.imageUrl) updateFavicon(parsed.imageUrl);
          }
        } catch {
          if (mounted) setSettings(DEFAULT_SETTINGS), setOriginalSettings(DEFAULT_SETTINGS);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({
          ...prev,
          type: 'image',
          imageUrl: event.target?.result as string
        }));
        setActiveTab('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTab === 'image' && settings.imageUrl) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - settings.positionX, y: e.clientY - settings.positionY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      // Limit position to reasonable bounds
      setSettings(prev => ({
        ...prev,
        positionX: Math.max(-100, Math.min(100, newX)),
        positionY: Math.max(-100, Math.min(100, newY))
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleLetterColorChange = (index: number, color: string) => {
    const newColors = [...settings.letterColors];
    newColors[index] = color;
    setSettings(prev => ({ ...prev, letterColors: newColors }));
  };

  const handleSave = async () => {
    let saveSettings: LogoSettings & { type: 'image' | 'text' } = { ...settings, type: activeTab };

    // In Firebase mode, never store base64 images in Firestore (doc size limit). Upload to Storage and save URL.
    if (isFirebaseConfigured() && saveSettings.type === 'image' && saveSettings.imageUrl?.startsWith('data:')) {
      try {
        const file = await dataUrlToFile(saveSettings.imageUrl, `app-logo-${Date.now()}.png`);
        const upload = await firestoreStorageService.uploadFile(STORAGE_PATHS.assets(file.name), file);
        if (!upload.success || !upload.url) throw new Error(upload.error || 'Upload failed');
        saveSettings = { ...saveSettings, imageUrl: upload.url };
      } catch (e) {
        console.error('[AppLogoSettings] Logo upload failed:', e);
        toast.error('Logo image upload failed. Please try a smaller image.');
        return;
      }
    }
    if (isFirebaseConfigured()) {
      try {
        await firestoreLogoSettingsService.set(saveSettings);
      } catch (e) {
        toast.error('Failed to save logo to cloud');
        return;
      }
    }
    localStorage.setItem('qgenesis-logo-settings', JSON.stringify(saveSettings));
    setOriginalSettings(saveSettings);
    await updateFaviconFromLogo(saveSettings);
    window.dispatchEvent(new CustomEvent('logo-settings-updated'));
    toast.success('Logo settings saved! Changes will reflect across the app and favicon.');
  };

  const handleReset = async () => {
    setSettings(DEFAULT_SETTINGS);
    setActiveTab('image');
    if (isFirebaseConfigured()) {
      try {
        await firestoreLogoSettingsService.set({ ...DEFAULT_SETTINGS, type: 'image' });
      } catch (_) {}
    }
    localStorage.removeItem('qgenesis-logo-settings');
    setOriginalSettings(DEFAULT_SETTINGS);
    updateFavicon('/favicon.png');
    window.dispatchEvent(new CustomEvent('logo-settings-updated'));
    toast.success('Logo settings reset to defaults');
  };

  const handleRemoveImage = () => {
    setSettings(prev => ({ ...prev, imageUrl: '', type: 'text' }));
    setActiveTab('text');
  };

  // Remove background using canvas
  const handleRemoveBackground = async () => {
    if (!settings.imageUrl) return;
    
    setIsRemovingBackground(true);
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = settings.imageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Simple background removal - remove near-white pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is close to white or light gray
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
        // Also check for near-white with slight variations
        else if (r > 220 && g > 220 && b > 220 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      
      const newImageUrl = canvas.toDataURL('image/png');
      // Store original image URL before removing background
      setSettings(prev => {
        const originalUrl = prev.removeBackground ? prev.imageUrl : prev.imageUrl;
        localStorage.setItem('qgenesis-original-image', originalUrl);
        return { ...prev, imageUrl: newImageUrl, removeBackground: true };
      });
      
      toast.success('Background removed successfully!');
    } catch (error) {
      console.error('Background removal error:', error);
      toast.error('Failed to remove background. Try a different image.');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const getShapeClasses = () => {
    switch (settings.shape) {
      case 'circle':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-2xl';
      default:
        return 'rounded-none';
    }
  };

  const getImageStyle = () => ({
    transform: `scale(${settings.zoom / 100}) translate(${settings.positionX}px, ${settings.positionY}px)`,
    filter: `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturate}%) hue-rotate(${settings.hueRotate}deg)`
  });

  const getOriginalImageStyle = () => ({
    transform: `scale(${originalSettings.zoom / 100}) translate(${originalSettings.positionX}px, ${originalSettings.positionY}px)`,
    filter: `brightness(${originalSettings.brightness}%) contrast(${originalSettings.contrast}%) saturate(${originalSettings.saturate}%) hue-rotate(${originalSettings.hueRotate}deg)`
  });

  const getFontFamily = () => {
    const font = FONT_OPTIONS.find(f => f.value === settings.font);
    return font?.family || "'Orbitron', sans-serif";
  };

  const getTextLogoPreview = (useOriginal = false) => {
    const s = useOriginal ? originalSettings : settings;
    const fontFamily = FONT_OPTIONS.find(f => f.value === s.font)?.family || "'Orbitron', sans-serif";
    
    return s.text.split('').map((letter, index) => (
      <span
        key={index}
        style={{ 
          color: s.letterColors[index % s.letterColors.length],
          fontFamily: fontFamily,
        }}
        className="font-bold text-4xl"
      >
        {letter}
      </span>
    ));
  };

  const renderLogoPreview = (isOriginal = false) => {
    const s = isOriginal ? originalSettings : settings;
    const tab = isOriginal ? originalSettings.type : activeTab;
    const style = isOriginal ? getOriginalImageStyle() : getImageStyle();
    const shapeClass = isOriginal 
      ? (originalSettings.shape === 'circle' ? 'rounded-full' : originalSettings.shape === 'rounded' ? 'rounded-2xl' : 'rounded-none')
      : getShapeClasses();

    if (tab === 'image' && s.imageUrl) {
      return (
        <div className={`overflow-hidden ${shapeClass} h-24 w-24`}>
          <img
            src={s.imageUrl}
            alt="Logo preview"
            className="h-24 w-24 object-cover select-none"
            style={style}
            draggable={false}
          />
        </div>
      );
    }
    return (
      <div className="flex">
        {getTextLogoPreview(isOriginal)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">App Logo Settings</h2>
          <p className="text-muted-foreground">Customize the app logo with image or text</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              checked={previewMode}
              onCheckedChange={setPreviewMode}
            />
            <Label className="flex items-center gap-1">
              <SplitSquareHorizontal className="w-4 h-4" />
              Preview Mode
            </Label>
          </div>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              handleSave();
              window.open('/', '_blank');
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Live Preview
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Logo
          </Button>
        </div>
      </div>

      {/* Split Screen Preview Mode */}
      {previewMode && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SplitSquareHorizontal className="w-5 h-5" />
              Before / After Comparison
            </CardTitle>
            <CardDescription>Compare your changes with the current saved logo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-gradient-to-br from-muted/50 to-muted rounded-xl flex flex-col items-center justify-center min-h-[160px]">
                <p className="text-xs text-muted-foreground mb-4 font-medium">BEFORE (Current Saved)</p>
                {renderLogoPreview(true)}
              </div>
              <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl flex flex-col items-center justify-center min-h-[160px] border-2 border-primary/20">
                <p className="text-xs text-primary mb-4 font-medium">AFTER (Preview)</p>
                {renderLogoPreview(false)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Logo Editor</CardTitle>
            <CardDescription>Choose between image or text logo</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'image' | 'text')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="image" className="gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image Logo
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-2">
                  <Type className="w-4 h-4" />
                  Text Logo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-4">
                {/* Upload */}
                <div className="space-y-2">
                  <Label>Upload Logo Image</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Image
                    </Button>
                    {settings.imageUrl && settings.imageUrl !== qgenesisLogo && (
                      <Button variant="destructive" size="icon" onClick={handleRemoveImage}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {settings.imageUrl && (
                  <>
                    {/* Zoom */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <ZoomIn className="w-4 h-4" />
                          Zoom
                        </Label>
                        <span className="text-sm text-muted-foreground">{settings.zoom}%</span>
                      </div>
                      <Slider
                        value={[settings.zoom]}
                        onValueChange={([v]) => setSettings(prev => ({ ...prev, zoom: v }))}
                        min={50}
                        max={200}
                        step={5}
                      />
                    </div>

                    {/* Position X */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Move className="w-4 h-4" />
                          Position X
                        </Label>
                        <span className="text-sm text-muted-foreground">{settings.positionX}px</span>
                      </div>
                      <Slider
                        value={[settings.positionX]}
                        onValueChange={([v]) => setSettings(prev => ({ ...prev, positionX: v }))}
                        min={-100}
                        max={100}
                        step={5}
                      />
                    </div>

                    {/* Position Y */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Move className="w-4 h-4" />
                          Position Y
                        </Label>
                        <span className="text-sm text-muted-foreground">{settings.positionY}px</span>
                      </div>
                      <Slider
                        value={[settings.positionY]}
                        onValueChange={([v]) => setSettings(prev => ({ ...prev, positionY: v }))}
                        min={-100}
                        max={100}
                        step={5}
                      />
                    </div>

                    {/* Brightness */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Brightness</Label>
                        <span className="text-sm text-muted-foreground">{settings.brightness}%</span>
                      </div>
                      <Slider
                        value={[settings.brightness]}
                        onValueChange={([v]) => setSettings(prev => ({ ...prev, brightness: v }))}
                        min={0}
                        max={200}
                        step={5}
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Contrast</Label>
                        <span className="text-sm text-muted-foreground">{settings.contrast}%</span>
                      </div>
                      <Slider
                        value={[settings.contrast]}
                        onValueChange={([v]) => setSettings(prev => ({ ...prev, contrast: v }))}
                        min={0}
                        max={200}
                        step={5}
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Saturation</Label>
                        <span className="text-sm text-muted-foreground">{settings.saturate}%</span>
                      </div>
                      <Slider
                        value={[settings.saturate]}
                        onValueChange={([v]) => setSettings(prev => ({ ...prev, saturate: v }))}
                        min={0}
                        max={200}
                        step={5}
                      />
                    </div>

                    {/* Hue Rotate */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Hue Rotate
                        </Label>
                        <span className="text-sm text-muted-foreground">{settings.hueRotate}°</span>
                      </div>
                      <Slider
                        value={[settings.hueRotate]}
                        onValueChange={([v]) => setSettings(prev => ({ ...prev, hueRotate: v }))}
                        min={0}
                        max={360}
                        step={10}
                      />
                    </div>

                    {/* Shape Options */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Square className="w-4 h-4" />
                        Logo Shape
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant={settings.shape === 'square' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSettings(prev => ({ ...prev, shape: 'square' }))}
                          className="flex-1"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Square
                        </Button>
                        <Button
                          variant={settings.shape === 'rounded' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSettings(prev => ({ ...prev, shape: 'rounded' }))}
                          className="flex-1"
                        >
                          <RectangleHorizontal className="w-4 h-4 mr-2" />
                          Rounded
                        </Button>
                        <Button
                          variant={settings.shape === 'circle' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSettings(prev => ({ ...prev, shape: 'circle' }))}
                          className="flex-1"
                        >
                          <Circle className="w-4 h-4 mr-2" />
                          Circle
                        </Button>
                      </div>
                    </div>

                    {/* Background Removal */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Eraser className="w-4 h-4" />
                        Background
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleRemoveBackground}
                          disabled={isRemovingBackground || settings.removeBackground}
                        >
                          {isRemovingBackground ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Eraser className="w-4 h-4 mr-2" />
                              Remove BG
                            </>
                          )}
                        </Button>
                        {settings.removeBackground && (
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              // Restore original image by re-reading from stored original or resetting
                              const stored = localStorage.getItem('qgenesis-logo-settings');
                              if (stored) {
                                try {
                                  const parsed = JSON.parse(stored);
                                  if (parsed.originalImageUrl) {
                                    setSettings(prev => ({ 
                                      ...prev, 
                                      imageUrl: parsed.originalImageUrl, 
                                      removeBackground: false 
                                    }));
                                    toast.success('Background restored');
                                    return;
                                  }
                                } catch {}
                              }
                              // Fallback: reset to default logo
                              setSettings(prev => ({ 
                                ...prev, 
                                imageUrl: qgenesisLogo, 
                                removeBackground: false 
                              }));
                              toast.success('Background restored to default');
                            }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore BG
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {settings.removeBackground 
                          ? 'Background removed. Click "Restore BG" to undo.' 
                          : 'Removes white/light background from the logo image'}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Move className="w-3 h-3" />
                      Use sliders to adjust position or drag in preview
                    </p>
                  </>
                )}
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                {/* Text input */}
                <div className="space-y-2">
                  <Label>Logo Text</Label>
                  <Input
                    value={settings.text}
                    onChange={(e) => setSettings(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter logo text"
                    maxLength={20}
                  />
                </div>

                {/* Font selector */}
                <div className="space-y-2">
                  <Label>Font Style</Label>
                  <Select
                    value={settings.font}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, font: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.family }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Letter colors */}
                <div className="space-y-2">
                  <Label>Letter Colors</Label>
                  <p className="text-xs text-muted-foreground mb-2">Click on each letter to change its color</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.text.split('').map((letter, index) => (
                      <div key={index} className="flex flex-col items-center gap-1">
                        <span
                          className="text-2xl font-bold"
                          style={{ 
                            color: settings.letterColors[index % settings.letterColors.length],
                            fontFamily: getFontFamily(),
                          }}
                        >
                          {letter}
                        </span>
                        <input
                          type="color"
                          value={settings.letterColors[index % settings.letterColors.length]}
                          onChange={(e) => handleLetterColorChange(index, e.target.value)}
                          className="w-8 h-6 rounded cursor-pointer border-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick color presets */}
                <div className="space-y-2">
                  <Label>Color Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Purple Gradient', colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'] },
                      { name: 'Ocean Blue', colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b'] },
                      { name: 'Sunset', colors: ['#f43f5e', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'] },
                      { name: 'Monochrome', colors: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'] },
                    ].map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, letterColors: preset.colors }))}
                        className="text-xs"
                      >
                        <div className="flex gap-0.5 mr-2">
                          {preset.colors.slice(0, 4).map((c, i) => (
                            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Logo Preview
            </CardTitle>
            <CardDescription>See how your logo will appear across the app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Preview */}
            <div
              ref={previewRef}
              className={`relative w-full h-40 bg-gradient-to-br from-muted/50 to-muted rounded-xl overflow-hidden flex items-center justify-center cursor-move ${settings.removeBackground ? 'bg-checkered' : ''}`}
              style={settings.removeBackground ? { backgroundImage: 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%)', backgroundSize: '16px 16px' } : {}}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {activeTab === 'image' && settings.imageUrl ? (
                <div className={`overflow-hidden ${getShapeClasses()}`}>
                  <img
                    src={settings.imageUrl}
                    alt="Logo preview"
                    className="max-h-32 w-auto object-cover select-none"
                    style={getImageStyle()}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="flex">
                  {getTextLogoPreview()}
                </div>
              )}
            </div>

            {/* Context previews */}
            <div className="space-y-4">
              <Label>How it looks in different contexts:</Label>
              
              {/* Navbar preview */}
              <div className="p-4 bg-card rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Navigation Bar</p>
                <div className="flex items-center gap-3">
                  {activeTab === 'image' && settings.imageUrl ? (
                    <div className={`overflow-hidden ${getShapeClasses()}`}>
                      <img
                        src={settings.imageUrl}
                        alt="Logo"
                        className="h-10 w-10 object-cover"
                        style={getImageStyle()}
                      />
                    </div>
                  ) : (
                    <div className="flex text-xl">
                      {settings.text.split('').map((letter, index) => (
                        <span
                          key={index}
                          style={{ 
                            color: settings.letterColors[index % settings.letterColors.length],
                            fontFamily: getFontFamily(),
                          }}
                          className="font-bold"
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar preview */}
              <div className="p-4 bg-card rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Dashboard Sidebar</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg overflow-hidden ${getShapeClasses()}`}>
                    {activeTab === 'image' && settings.imageUrl ? (
                      <img
                        src={settings.imageUrl}
                        alt="Logo"
                        className="w-6 h-6 object-cover"
                        style={getImageStyle()}
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">Q</span>
                    )}
                  </div>
                  {activeTab === 'text' ? (
                    <div className="flex text-lg">
                      {settings.text.split('').map((letter, index) => (
                        <span
                          key={index}
                          style={{ 
                            color: settings.letterColors[index % settings.letterColors.length],
                            fontFamily: getFontFamily(),
                          }}
                          className="font-bold"
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-foreground">QGenesis</span>
                  )}
                </div>
              </div>

              {/* Footer preview */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Footer</p>
                <div className="flex items-center gap-2">
                  {activeTab === 'image' && settings.imageUrl ? (
                    <div className={`overflow-hidden opacity-80 ${getShapeClasses()}`}>
                      <img
                        src={settings.imageUrl}
                        alt="Logo"
                        className="h-8 w-8 object-cover"
                        style={getImageStyle()}
                      />
                    </div>
                  ) : (
                    <div className="flex text-sm opacity-80">
                      {settings.text.split('').map((letter, index) => (
                        <span
                          key={index}
                          style={{ 
                            color: settings.letterColors[index % settings.letterColors.length],
                            fontFamily: getFontFamily(),
                          }}
                          className="font-bold"
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default AppLogoSettings;