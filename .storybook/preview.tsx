import React from 'react';
import type { Preview } from '@storybook/react';
import { SessionProvider } from 'next-auth/react';
import '../app/globals.css';

const mockSession = {
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'TEACHER',
    teacherProfile: {
      id: '1',
      bio: 'Experienced guitar teacher',
      hourlyRate: 6000,
    },
  },
  expires: '2025-12-31',
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
  },
  decorators: [
    (Story) => (
      <SessionProvider session={mockSession}>
        <div className="min-h-screen bg-background">
          <Story />
        </div>
      </SessionProvider>
    ),
  ],
};

export default preview;