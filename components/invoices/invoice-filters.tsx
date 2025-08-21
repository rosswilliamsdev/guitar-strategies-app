'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import type { StudentProfile, InvoiceStatus } from '@/types';

interface InvoiceFiltersProps {
  students: Array<StudentProfile & { user: { id: string; name: string | null } }>;
}

export function InvoiceFilters({ students }: InvoiceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('student') || 'all');
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get('month') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (selectedStudent && selectedStudent !== 'all') {
      params.append('student', selectedStudent);
    }
    if (selectedMonth) {
      params.append('month', selectedMonth);
    }
    if (selectedStatus && selectedStatus !== 'all') {
      params.append('status', selectedStatus);
    }
    
    const queryString = params.toString();
    router.push(`/invoices${queryString ? `?${queryString}` : ''}`);
  };

  const handleClear = () => {
    setSelectedStudent('all');
    setSelectedMonth('');
    setSelectedStatus('all');
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
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
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
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleSearch}
          >
            <Search className="h-3 w-3 mr-1" />
            Search
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );
}