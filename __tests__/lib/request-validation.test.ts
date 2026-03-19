import { describe, it, expect } from 'vitest';
import { validateJsonSize, REQUEST_LIMITS } from '@/lib/request-validation';

describe('validateJsonSize', () => {
  it('should return null when data is within limit', () => {
    const smallData = { message: 'Hello world' };
    const result = validateJsonSize(smallData, 'DEFAULT');

    expect(result).toBeNull();
  });

  it('should return 413 response when data exceeds limit', () => {
    // Create data over 50KB (RICH_TEXT limit)
    const hugeData = { text: 'x'.repeat(60000) };
    const result = validateJsonSize(hugeData, 'RICH_TEXT');

    expect(result).not.toBeNull();
    expect(result?.status).toBe(413);
  });

  it('should work with RICH_TEXT limit type (50KB)', () => {
    // Create data just under 50KB limit
    const mediumData = { text: 'x'.repeat(40000) };
    const result = validateJsonSize(mediumData, 'RICH_TEXT');

    expect(result).toBeNull();
  });

  it('should correctly calculate size for nested objects', () => {
    const nestedData = {
      student: {
        id: 'student-123',
        name: 'John Doe',
        profile: {
          instrument: 'guitar',
          level: 'intermediate',
        },
      },
      lesson: {
        notes: 'Test notes',
        homework: 'Practice scales',
      },
    };

    const result = validateJsonSize(nestedData, 'DEFAULT');

    // This small nested object should pass DEFAULT (1MB) limit
    expect(result).toBeNull();
  });
});
