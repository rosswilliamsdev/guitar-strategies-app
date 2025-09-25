'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/design';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  requirements: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    symbol: boolean;
  };
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[@$!%*?&]/.test(password),
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;

  let score = 0;
  let label = '';
  let color = '';

  if (password.length === 0) {
    score = 0;
    label = '';
    color = 'bg-neutral-200';
  } else if (metRequirements < 2) {
    score = 1;
    label = 'Very Weak';
    color = 'bg-red-500';
  } else if (metRequirements < 3) {
    score = 2;
    label = 'Weak';
    color = 'bg-orange-500';
  } else if (metRequirements < 4) {
    score = 3;
    label = 'Fair';
    color = 'bg-yellow-500';
  } else if (metRequirements < 5) {
    score = 4;
    label = 'Good';
    color = 'bg-blue-500';
  } else {
    score = 5;
    label = 'Strong';
    color = 'bg-green-500';
  }

  return { score, label, color, requirements };
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState<PasswordStrength>(() =>
    calculatePasswordStrength(password)
  );

  useEffect(() => {
    setStrength(calculatePasswordStrength(password));
  }, [password]);

  if (!password) {
    return null;
  }

  const strengthBars = Array.from({ length: 5 }, (_, index) => (
    <div
      key={index}
      className={cn(
        'h-1 rounded-full transition-colors duration-200',
        index < strength.score ? strength.color : 'bg-neutral-200'
      )}
    />
  ));

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bars */}
      <div className="grid grid-cols-5 gap-1">
        {strengthBars}
      </div>

      {/* Strength label */}
      {strength.label && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-600">Password strength:</span>
          <span className={cn(
            'font-medium',
            strength.score === 1 && 'text-red-600',
            strength.score === 2 && 'text-orange-600',
            strength.score === 3 && 'text-yellow-600',
            strength.score === 4 && 'text-blue-600',
            strength.score === 5 && 'text-green-600'
          )}>
            {strength.label}
          </span>
        </div>
      )}

      {/* Requirements checklist */}
      <div className="space-y-1 text-xs text-neutral-600">
        <RequirementItem
          met={strength.requirements.length}
          text="At least 8 characters"
        />
        <RequirementItem
          met={strength.requirements.lowercase}
          text="One lowercase letter (a-z)"
        />
        <RequirementItem
          met={strength.requirements.uppercase}
          text="One uppercase letter (A-Z)"
        />
        <RequirementItem
          met={strength.requirements.number}
          text="One number (0-9)"
        />
        <RequirementItem
          met={strength.requirements.symbol}
          text="One special character (@$!%*?&)"
        />
      </div>
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'w-3 h-3 rounded-full flex items-center justify-center text-[10px] font-bold',
        met
          ? 'bg-green-100 text-green-600'
          : 'bg-neutral-100 text-neutral-400'
      )}>
        {met ? '✓' : '○'}
      </div>
      <span className={cn(
        met ? 'text-green-600' : 'text-neutral-500'
      )}>
        {text}
      </span>
    </div>
  );
}