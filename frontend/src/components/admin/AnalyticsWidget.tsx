import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, FileText, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuestionStore } from '@/stores/questionStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface TrendData {
  date: string;
  generated: number;
  approved: number;
  rejected: number;
  pending: number;
}

const AnalyticsWidget: React.FC = () => {
  const { questions } = useQuestionStore();
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate real-time stats
  const totalQuestions = questions.length;
  const approvedCount = questions.filter(q => q.status === 'approved').length;
  const rejectedCount = questions.filter(q => q.status === 'rejected').length;
  const pendingCount = questions.filter(q => q.status === 'pending').length;
  const draftCount = questions.filter(q => q.status === 'draft').length;

  const approvalRate = totalQuestions > 0 ? Math.round((approvedCount / totalQuestions) * 100) : 0;
  const rejectionRate = totalQuestions > 0 ? Math.round((rejectedCount / totalQuestions) * 100) : 0;

  // Generate trend data based on actual questions
  useEffect(() => {
    generateTrendData();
  }, [questions]);

  const generateTrendData = () => {
    const last7Days: TrendData[] = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Filter questions created on this day
      const dayQuestions = questions.filter(q => {
        const qDate = new Date(q.createdAt);
        return qDate.toDateString() === date.toDateString();
      });
      
      last7Days.push({
        date: dateStr,
        generated: dayQuestions.length,
        approved: dayQuestions.filter(q => q.status === 'approved').length,
        rejected: dayQuestions.filter(q => q.status === 'rejected').length,
        pending: dayQuestions.filter(q => q.status === 'pending').length,
      });
    }
    
    setTrendData(last7Days);
    setLastUpdated(new Date());
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      generateTrendData();
      setIsRefreshing(false);
    }, 500);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      generateTrendData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [questions]);

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    trend, 
    color 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    trend?: 'up' | 'down'; 
    color: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-gradient-to-br ${color} border border-border/50`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-muted-foreground" />
        {trend && (
          <Badge variant={trend === 'up' ? 'default' : 'destructive'} className="text-xs">
            {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trend === 'up' ? '+' : '-'}5%
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </motion.div>
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Real-time Analytics
          </CardTitle>
          <CardDescription>
            Question generation trends and approval rates
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={FileText}
            label="Total Questions"
            value={totalQuestions}
            color="from-blue-500/10 to-cyan-500/10"
          />
          <StatCard
            icon={CheckCircle}
            label="Approved"
            value={approvedCount}
            trend="up"
            color="from-green-500/10 to-emerald-500/10"
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value={rejectedCount}
            color="from-red-500/10 to-rose-500/10"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={pendingCount}
            color="from-amber-500/10 to-yellow-500/10"
          />
        </div>

        {/* Approval Rate */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
          <div>
            <p className="text-sm text-muted-foreground">Overall Approval Rate</p>
            <p className="text-3xl font-bold text-foreground">{approvalRate}%</p>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                strokeWidth="8"
                fill="none"
                className="stroke-muted"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${approvalRate * 2.51} 251`}
                className="stroke-primary transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
              {approvalRate}%
            </span>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorGenerated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="generated" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1}
                fill="url(#colorGenerated)"
                name="Generated"
              />
              <Area 
                type="monotone" 
                dataKey="approved" 
                stroke="#22c55e" 
                fillOpacity={1}
                fill="url(#colorApproved)"
                name="Approved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Generated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Approved</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsWidget;