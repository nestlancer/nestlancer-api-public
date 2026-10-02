export interface DashboardOverview {
  period: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    totalUsers: number;
    newUsers: number;
    activeProjects: number;
    completedProjects: number;
    pendingRequests: number;
    openQuotes: number;
    revenueThisMonth: number;
    currency: string;
  };
  trends: {
    users: TrendData;
    revenue: TrendData;
    projects: TrendData;
    requests: TrendData;
  };
  recentActivity: ActivityItem[];
  alerts: SystemAlert[];
  charts: {
    revenueByMonth: { date: string; amount: number }[];
    usersByDay: { date: string; new: number; active: number }[];
    projectsByStatus: Record<string, number>;
  };
  quickStats: {
    avgProjectValue: number;
    avgProjectDuration: string;
    clientSatisfaction: number;
    repeatClientRate: number;
  };
  systemHealth?: 'healthy' | 'degraded' | 'unhealthy';
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'flat';
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  project?: { id: string; title: string };
  user?: { id: string; name: string };
  quote?: { id: string; amount: number };
  timestamp: string | Date;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action?: { text: string; url: string };
  timestamp: string | Date;
}

export interface RevenueData {
  total: number;
  currency: string;
  trends: TrendData;
  byCategory: { category: string; amount: number }[];
  chartData: { date: string; amount: number }[];
}

export interface UserMetrics {
  total: number;
  active: number;
  newThisMonth: number;
  byRole: Record<string, number>;
  chartData: { date: string; count: number }[];
  trend?: TrendData;
}

export interface ProjectMetrics {
  total: number;
  byStatus: Record<string, number>;
  avgCompletionTimeDays: number;
  onTimeRate: number;
}

export interface PerformanceMetrics {
  responseTime: { p50: number; p95: number; p99: number };
  errorRate: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}
