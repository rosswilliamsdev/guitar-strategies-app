'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';

interface RegisterFormProps {
  callbackUrl?: string;
}

interface Teacher {
  id: string;
  user: {
    name: string;
  };
}

export function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER',
    teacherId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/login?message=Registration successful');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch teachers when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const teachersResponse = await fetch('/api/teachers');
        if (teachersResponse.ok) {
          const teachersData = await teachersResponse.json();
          setTeachers(teachersData.teachers || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-button">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-ui-label text-brand-black mb-1">
          Full Name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Full name"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-ui-label text-brand-black mb-1">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email address"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-ui-label text-brand-black mb-1">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
          disabled={isLoading}
        />
        <PasswordStrengthMeter password={formData.password} className="mt-2" />
      </div>

      <div>
        <label htmlFor="role" className="block text-ui-label text-brand-black mb-1">
          I am a...
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="flex h-10 w-full rounded-button border border-gray-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tiffany focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
        </select>
      </div>

      {formData.role === 'STUDENT' && (
        <div>
          <label htmlFor="teacherId" className="block text-ui-label text-brand-black mb-1">
            Select Your Teacher <span className="text-red-500">*</span>
          </label>
          <select
            id="teacherId"
            name="teacherId"
            value={formData.teacherId}
            onChange={handleChange}
            className="flex h-10 w-full rounded-button border border-gray-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tiffany focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required={formData.role === 'STUDENT'}
            disabled={isLoading}
          >
            <option value="">-- Select a teacher --</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.user.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Don't see your teacher? Ask them to create an account first.
          </p>
        </div>
      )}


      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            Creating account...
          </div>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  );
}