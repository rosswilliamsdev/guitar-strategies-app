'use client';

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface EarningsData {
  month: string;
  earnings: number;
  lessonsCount: number;
}

interface EarningsChartProps {
  data: EarningsData[];
  isLoading?: boolean;
}

export function EarningsChart({ data, isLoading = false }: EarningsChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Earnings History
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Earnings History
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No earnings data available yet.
          </p>
        </div>
      </Card>
    );
  }

  const maxEarnings = Math.max(...data.map(d => d.earnings));
  const totalEarnings = data.reduce((sum, d) => sum + d.earnings, 0);
  const avgEarnings = totalEarnings / data.length;

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Earnings History
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">
            {formatCurrency(avgEarnings)} avg/month
          </span>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.month} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                {formatMonth(item.month)}
              </span>
              <div className="flex items-center space-x-3">
                <span className="text-muted-foreground">
                  {item.lessonsCount} lessons
                </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(item.earnings)}
                </span>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-500 ease-out"
                  style={{
                    width: maxEarnings > 0 ? `${(item.earnings / maxEarnings) * 100}%` : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Earnings</p>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(totalEarnings)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Lessons</p>
            <p className="text-lg font-semibold text-blue-600">
              {data.reduce((sum, d) => sum + d.lessonsCount, 0)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}