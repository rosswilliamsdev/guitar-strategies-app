'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import type { StudentProfile, InvoiceStatus } from '@/types';

interface InvoiceFiltersProps {
  students: Array<StudentProfile & { user: { id: string; name: string | null } }>;
}

export function InvoiceFilters({ students }: InvoiceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedStudent = searchParams.get('student') || 'all';
  const selectedMonth = searchParams.get('month') || '';
  const selectedStatus = searchParams.get('status') || 'all';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value && value !== 'all' && value !== '') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filtering
    params.delete('page');
    
    const queryString = params.toString();
    router.push(`/invoices${queryString ? `?${queryString}` : ''}`);
  };

  const handleClear = () => {
    router.push('/invoices');
  };

  return (
    <Card className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Select value={selectedStudent} onValueChange={(value) => updateFilters('student', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select value={selectedStatus} onValueChange={(value) => updateFilters('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="VIEWED">Viewed</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Input
            type="month"
            placeholder="Select month"
            value={selectedMonth}
            onChange={(e) => updateFilters('month', e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center justify-end">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleClear}
          >
            Clear All
          </Button>
        </div>
      </div>
    </Card>
  );
}