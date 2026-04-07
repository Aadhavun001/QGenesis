import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden rounded-full transition-all duration-300 hover:scale-110 bg-gradient-to-r from-qgenesis-purple/20 to-qgenesis-pink/20 hover:from-qgenesis-purple/30 hover:to-qgenesis-pink/30 border border-qgenesis-purple/30"
    >
      <Sun className={`h-5 w-5 transition-all duration-500 text-qgenesis-orange ${theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
      <Moon className={`absolute h-5 w-5 transition-all duration-500 text-qgenesis-indigo ${theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default ThemeToggle;
