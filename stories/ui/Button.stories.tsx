import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive', 'ghost', 'link'],
    },
    size: {
      control: 'select', 
      options: ['default', 'sm', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Primary Action',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete Item',
    variant: 'destructive',
  },
};

export const Role: Story = {
  args: {
    children: 'Role Button',
    variant: 'role',
    role: 'TEACHER',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};