import { describe, it, expect } from 'vitest';
import { createLessonSchema } from '@/lib/validations';
import { ZodError } from 'zod';

describe('createLessonSchema', () => {
  it('should parse valid complete lesson data', () => {
    const validData = {
      studentId: 'student-123',
      date: '2025-03-16T10:00:00Z',
      duration: 60,
      notes: 'Great progress on scales',
      homework: 'Practice C major scale',
      progress: 'Mastered basic chords',
      focusAreas: ['scales', 'chords'],
      songsPracticed: ['Wonderwall', 'Blackbird'],
      status: 'COMPLETED' as const,
      studentRating: 5,
      teacherRating: 4,
    };

    const result = createLessonSchema.parse(validData);

    expect(result.studentId).toBe('student-123');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.duration).toBe(60);
    expect(result.status).toBe('COMPLETED');
  });

  it('should throw ZodError when studentId is missing', () => {
    const invalidData = {
      date: '2025-03-16T10:00:00Z',
      duration: 30,
    };

    expect(() => createLessonSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('should coerce ISO date string to Date object', () => {
    const data = {
      studentId: 'student-123',
      date: '2025-03-16T14:30:00Z',
    };

    const result = createLessonSchema.parse(data);

    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString()).toBe('2025-03-16T14:30:00.000Z');
  });

  it('should apply default duration of 30 minutes when not provided', () => {
    const data = {
      studentId: 'student-123',
      date: '2025-03-16T10:00:00Z',
    };

    const result = createLessonSchema.parse(data);

    expect(result.duration).toBe(30);
  });

  it('should enforce duration bounds (15-180 minutes)', () => {
    const tooShort = {
      studentId: 'student-123',
      date: '2025-03-16T10:00:00Z',
      duration: 10,
    };

    const tooLong = {
      studentId: 'student-123',
      date: '2025-03-16T10:00:00Z',
      duration: 200,
    };

    const valid = {
      studentId: 'student-123',
      date: '2025-03-16T10:00:00Z',
      duration: 60,
    };

    expect(() => createLessonSchema.parse(tooShort)).toThrow(ZodError);
    expect(() => createLessonSchema.parse(tooLong)).toThrow(ZodError);
    expect(() => createLessonSchema.parse(valid)).not.toThrow();
  });

  it('should accept undefined for optional fields', () => {
    const minimalData = {
      studentId: 'student-123',
      date: '2025-03-16T10:00:00Z',
      // All other fields are optional
    };

    const result = createLessonSchema.parse(minimalData);

    expect(result.studentId).toBe('student-123');
    expect(result.duration).toBe(30); // default
    expect(result.status).toBe('COMPLETED'); // default
    expect(result.notes).toBeUndefined();
    expect(result.homework).toBeUndefined();
    expect(result.progress).toBeUndefined();
  });
});
