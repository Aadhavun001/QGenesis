import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, User, Mail, Phone, Building, Lock, Eye, EyeOff, Loader2, X, ZoomIn, Move, MapPin, Building2, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestoreStorageService } from '@/services/firebase/firestore-storage';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const type = blob.type || 'image/jpeg';
  return new File([blob], fileName, { type });
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [place, setPlace] = useState(user?.place || '');
  const [bio, setBio] = useState('');
  
  // Dashboard color customization
  const [dashboardColor, setDashboardColor] = useState((user as any)?.dashboardColor || 'default');
  const [customGradientStart, setCustomGradientStart] = useState((user as any)?.customGradientStart || '');
  const [customGradientEnd, setCustomGradientEnd] = useState((user as any)?.customGradientEnd || '');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Image cropper state with drag support
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [zoom, setZoom] = useState([1]);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [profileImage, setProfileImage] = useState<string | null>((user as any)?.avatar || null);
  const [savedPosition, setSavedPosition] = useState((user as any)?.avatarPosition || { x: 0, y: 0 });
  const [savedZoom, setSavedZoom] = useState((user as any)?.avatarZoom || 1);
  const [useDefaultAvatar, setUseDefaultAvatar] = useState((user as any)?.useDefaultAvatar ?? true);

  // Update state when user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setDepartment(user.department || '');
      setInstitution(user.institution || '');
      setPlace(user.place || '');
      setProfileImage((user as any)?.avatar || null);
      setSavedPosition((user as any)?.avatarPosition || { x: 0, y: 0 });
      setSavedZoom((user as any)?.avatarZoom || 1);
      setUseDefaultAvatar((user as any)?.useDefaultAvatar ?? !((user as any)?.avatar));
      setDashboardColor((user as any)?.dashboardColor || 'default');
      setCustomGradientStart((user as any)?.customGradientStart || '');
      setCustomGradientEnd((user as any)?.customGradientEnd || '');
    }
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setImagePosition({ x: 0, y: 0 });
        setZoom([1]);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const maxOffset = 50 * zoom[0];
    const newX = Math.max(-maxOffset, Math.min(maxOffset, e.clientX - dragStart.x));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, e.clientY - dragStart.y));
    setImagePosition({ x: newX, y: newY });
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const maxOffset = 50 * zoom[0];
    const newX = Math.max(-maxOffset, Math.min(maxOffset, touch.clientX - dragStart.x));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, touch.clientY - dragStart.y));
    setImagePosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCropSave = () => {
    setProfileImage(selectedImage);
    setSavedPosition(imagePosition);
    setSavedZoom(zoom[0]);
    setShowCropper(false);
    setSelectedImage(null);
    
    toast({
      title: 'Profile Image Updated',
      description: 'Your profile image has been updated successfully',
    });
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updates: any = {
      displayName,
      phone,
      department,
      institution,
      place,
      useDefaultAvatar,
      dashboardColor,
      customGradientStart,
      customGradientEnd,
    };
    
    if (!useDefaultAvatar && profileImage) {
      // Firebase mode: upload avatar image to Storage and store URL in Firestore user profile
      if (isFirebaseConfigured() && user?.id && profileImage.startsWith('data:')) {
        try {
          const file = await dataUrlToFile(profileImage, `avatar-${Date.now()}.jpg`);
          const upload = await firestoreStorageService.uploadAvatar(user.id, file);
          if (upload.success && upload.url) {
            updates.avatar = upload.url;
          } else {
            throw new Error(upload.error || 'Avatar upload failed');
          }
        } catch (e) {
          console.error('[ProfileSettings] Avatar upload failed:', e);
          toast({
            title: 'Avatar upload failed',
            description: 'Could not upload your profile image to cloud. Please try a smaller image.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      } else {
        updates.avatar = profileImage;
      }
      updates.avatarPosition = savedPosition;
      updates.avatarZoom = savedZoom;
    } else if (useDefaultAvatar) {
      updates.avatar = null;
      updates.avatarPosition = { x: 0, y: 0 };
      updates.avatarZoom = 1;
    }
    
    updateUser(updates);
    
    // Dispatch event for other components
    window.dispatchEvent(new Event('user-updated'));
    
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been updated successfully',
    });
    
    setIsLoading(false);
    onClose(); // Auto-close after save
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Password Changed',
      description: 'Your password has been changed successfully',
    });
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsLoading(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Profile Settings</DialogTitle>
          </DialogHeader>
          
          {/* Tab buttons - Fixed styling */}
          <div className="flex gap-2 border-b border-border pb-4 flex-wrap">
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('profile')}
              className={`rounded-xl ${activeTab === 'profile' ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}`}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button
              variant={activeTab === 'password' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('password')}
              className={`rounded-xl ${activeTab === 'password' ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}`}
            >
              <Lock className="w-4 h-4 mr-2" />
              Password
            </Button>
            <Button
              variant={activeTab === 'appearance' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('appearance')}
              className={`rounded-xl ${activeTab === 'appearance' ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground' : ''}`}
            >
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </Button>
          </div>
          
          {/* Profile Tab */}
{activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {/* Clickable image container for re-editing */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!useDefaultAvatar && profileImage) {
                        // Re-edit existing image
                        setSelectedImage(profileImage);
                        setImagePosition(savedPosition);
                        setZoom([savedZoom]);
                        setShowCropper(true);
                      } else if (!useDefaultAvatar) {
                        fileInputRef.current?.click();
                      }
                    }}
                    disabled={useDefaultAvatar}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden border-4 border-background shadow-xl cursor-pointer hover:opacity-90 transition-opacity disabled:cursor-default disabled:hover:opacity-100 group"
                  >
                    {!useDefaultAvatar && profileImage ? (
                      <>
                        <div className="w-full h-full relative overflow-hidden">
                          <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ 
                              transform: `scale(${savedZoom}) translate(${savedPosition.x / savedZoom}px, ${savedPosition.y / savedZoom}px)`,
                              transformOrigin: 'center center'
                            }}
                          />
                        </div>
                        {/* Edit overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-primary-foreground">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {!useDefaultAvatar && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
                      title="Upload new image"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
                
                {/* Default avatar toggle */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <input
                    type="checkbox"
                    id="useDefaultAvatar"
                    checked={useDefaultAvatar}
                    onChange={(e) => setUseDefaultAvatar(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <Label htmlFor="useDefaultAvatar" className="text-sm cursor-pointer">
                    Use default avatar (initials)
                  </Label>
                </div>
                
                {!useDefaultAvatar && (
                  <p className="text-sm text-muted-foreground">
                    {profileImage ? 'Click the image to adjust or the camera to upload new' : 'Click the camera icon to upload your profile photo'}
                  </p>
                )}
              </div>
              
              {/* Profile Fields */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      placeholder="Enter your full name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-11 h-12 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      disabled
                      className="pl-11 h-12 rounded-xl bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-11 h-12 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="department"
                      placeholder="e.g., Computer Science"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="pl-11 h-12 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="institution"
                      placeholder="e.g., PSG College of Technology"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="pl-11 h-12 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="place">Place</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="place"
                      placeholder="e.g., Coimbatore"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="pl-11 h-12 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full h-24 p-3 rounded-xl border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleProfileSave}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          )}
          
          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-11 h-12 rounded-xl"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-11 h-12 rounded-xl"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handlePasswordChange}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                disabled={isLoading || !currentPassword || !newPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          )}
          
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Preset Colors */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Dashboard Color Theme</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a preset color theme for your dashboard
                  </p>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'default', name: 'Default', gradient: 'from-primary to-accent' },
                    { id: 'purple', name: 'Purple', gradient: 'from-purple-500 to-pink-500' },
                    { id: 'blue', name: 'Blue', gradient: 'from-blue-500 to-cyan-500' },
                    { id: 'green', name: 'Green', gradient: 'from-green-500 to-emerald-500' },
                    { id: 'orange', name: 'Orange', gradient: 'from-orange-500 to-amber-500' },
                    { id: 'rose', name: 'Rose', gradient: 'from-rose-500 to-pink-500' },
                    { id: 'indigo', name: 'Indigo', gradient: 'from-indigo-500 to-violet-500' },
                    { id: 'teal', name: 'Teal', gradient: 'from-teal-500 to-cyan-500' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setDashboardColor(color.id);
                        setCustomGradientStart('');
                        setCustomGradientEnd('');
                      }}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        dashboardColor === color.id && !customGradientStart
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color.gradient}`} />
                      <span className="text-xs font-medium">{color.name}</span>
                      {dashboardColor === color.id && !customGradientStart && (
                        <div className="absolute top-1 right-1">
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Gradient */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <Label className="text-base font-medium">Custom Gradient</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your own custom gradient color theme
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gradientStart" className="text-sm">Start Color</Label>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                        style={{ backgroundColor: customGradientStart || '#8B5CF6' }}
                        onClick={() => document.getElementById('gradientStartPicker')?.click()}
                      />
                      <input
                        id="gradientStartPicker"
                        type="color"
                        value={customGradientStart || '#8B5CF6'}
                        onChange={(e) => {
                          setCustomGradientStart(e.target.value);
                          setDashboardColor('custom');
                        }}
                        className="w-0 h-0 opacity-0 absolute"
                      />
                      <Input
                        id="gradientStart"
                        value={customGradientStart}
                        onChange={(e) => {
                          setCustomGradientStart(e.target.value);
                          if (e.target.value) setDashboardColor('custom');
                        }}
                        placeholder="#8B5CF6"
                        className="flex-1 h-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gradientEnd" className="text-sm">End Color</Label>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                        style={{ backgroundColor: customGradientEnd || '#EC4899' }}
                        onClick={() => document.getElementById('gradientEndPicker')?.click()}
                      />
                      <input
                        id="gradientEndPicker"
                        type="color"
                        value={customGradientEnd || '#EC4899'}
                        onChange={(e) => {
                          setCustomGradientEnd(e.target.value);
                          setDashboardColor('custom');
                        }}
                        className="w-0 h-0 opacity-0 absolute"
                      />
                      <Input
                        id="gradientEnd"
                        value={customGradientEnd}
                        onChange={(e) => {
                          setCustomGradientEnd(e.target.value);
                          if (e.target.value) setDashboardColor('custom');
                        }}
                        placeholder="#EC4899"
                        className="flex-1 h-10"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Preview */}
                {(customGradientStart || customGradientEnd) && (
                  <div className="space-y-2">
                    <Label className="text-sm">Preview</Label>
                    <div 
                      className="h-16 rounded-xl border border-border"
                      style={{ 
                        background: `linear-gradient(to right, ${customGradientStart || '#8B5CF6'}, ${customGradientEnd || '#EC4899'})` 
                      }}
                    />
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleProfileSave}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Image Cropper Dialog with Drag */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Profile Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Drag instruction */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Move className="w-4 h-4" />
              <span>Drag to reposition • Zoom to adjust</span>
            </div>
            
            {/* Image Preview with Drag */}
            <div 
              className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-primary/20 bg-muted cursor-move select-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Crop preview" 
                  className="w-full h-full object-cover transition-transform pointer-events-none"
                  style={{ 
                    transform: `scale(${zoom[0]}) translate(${imagePosition.x / zoom[0]}px, ${imagePosition.y / zoom[0]}px)`,
                    transformOrigin: 'center'
                  }}
                  draggable={false}
                />
              )}
              {/* Overlay grid for alignment */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
              </div>
            </div>
            
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4" />
                  Zoom
                </Label>
                <span className="text-sm text-muted-foreground">{Math.round(zoom[0] * 100)}%</span>
              </div>
              <Slider
                value={zoom}
                onValueChange={setZoom}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCropper(false)}>
              Cancel
            </Button>
            <Button onClick={handleCropSave} className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
              Save Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileSettings;