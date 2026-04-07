import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  onSelect: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  icon: Icon,
  title,
  description,
  features,
  gradient,
  onSelect,
}) => {
  return (
    <div className="group relative flex flex-col h-full p-8 rounded-3xl bg-card/60 backdrop-blur-md border border-border/50 hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
      {/* Gradient overlay */}
      <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-500 ${gradient}`} />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      
      {/* Features list */}
      <ul className="flex-1 space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${gradient} mt-2 flex-shrink-0`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      {/* CTA Button */}
      <Button 
        onClick={onSelect}
        className={`w-full ${gradient} text-white border-0 hover:opacity-90 group/btn`}
      >
        <span>Get Started as {title}</span>
        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
};

export default RoleCard;
