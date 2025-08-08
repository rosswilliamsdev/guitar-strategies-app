import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface StudentDashboardProps {
  studentId: string;
}

export function StudentDashboard({ studentId }: StudentDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Total Lessons</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Completed lessons</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Practice Streak</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Days in a row</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Skill Level</h3>
          <p className="text-xl font-bold text-purple-600">Beginner</p>
          <p className="text-sm text-gray-600 mt-2">Current level</p>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Next Lesson</h3>
          </div>
          <p className="text-gray-600">No upcoming lessons scheduled</p>
          <Link href="/lessons" className="block mt-4">
            <Button variant="secondary" size="sm">
              View All Lessons
            </Button>
          </Link>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Current Assignment</h3>
          </div>
          <p className="text-gray-600">No current assignments</p>
          <Link href="/assignments" className="block mt-4">
            <Button variant="secondary" size="sm">
              View Assignments
            </Button>
          </Link>
        </Card>
      </div>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Practice Progress</h3>
        <p className="text-gray-600">Start practicing to see your progress!</p>
      </Card>
    </div>
  );
}