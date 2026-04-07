import React from 'react';

interface AnimatedGradientProps {
  className?: string;
}

const AnimatedGradient: React.FC<AnimatedGradientProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Primary gradient blob */}
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/30 via-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
      
      {/* Secondary gradient blob */}
      <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/30 via-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse animation-delay-1000" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-green-500/20 rounded-full blur-2xl animate-float animation-delay-2000" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
    </div>
  );
};

export default AnimatedGradient;
