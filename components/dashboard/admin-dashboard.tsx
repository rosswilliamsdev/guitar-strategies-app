import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Registered users</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Active Teachers</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Teaching actively</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Total Lessons</h3>
          <p className="text-3xl font-bold text-purple-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Lessons completed</p>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/admin/users" className="block">
              <Button variant="secondary" className="w-full justify-start">
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/settings" className="block">
              <Button variant="secondary" className="w-full justify-start">
                System Settings
              </Button>
            </Link>
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <p className="text-gray-600">No recent activity</p>
        </Card>
      </div>
    </div>
  );
}