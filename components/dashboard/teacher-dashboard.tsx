import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TeacherDashboardProps {
  teacherId: string;
}

export function TeacherDashboard({ teacherId }: TeacherDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Students</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Active students</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">This Week</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Lessons scheduled</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">This Month</h3>
          <p className="text-3xl font-bold text-purple-600">$0</p>
          <p className="text-sm text-gray-600 mt-2">Revenue</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Library</h3>
          <p className="text-3xl font-bold text-orange-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Resources</p>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            <Link href="/lessons/new" className="block">
              <Button className="w-full justify-start">
                Log New Lesson
              </Button>
            </Link>
            <Link href="/students" className="block">
              <Button variant="secondary" className="w-full justify-start">
                View Students
              </Button>
            </Link>
            <Link href="/library" className="block">
              <Button variant="secondary" className="w-full justify-start">
                Manage Library
              </Button>
            </Link>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Lessons</h3>
            <Link href="/lessons">
              <Button variant="secondary" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <p className="text-gray-600">No recent lessons</p>
        </Card>
      </div>
    </div>
  );
}