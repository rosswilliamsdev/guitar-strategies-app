import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeRichText,
  sanitizeInput,
  isSafeContent
} from '@/lib/sanitize';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    const input = '<div class="test">Hello & "goodbye"</div>';
    const result = escapeHtml(input);

    expect(result).toBe('&lt;div class=&quot;test&quot;&gt;Hello &amp; &quot;goodbye&quot;&lt;&#x2F;div&gt;');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
  });

  it('should handle multiple special characters in one string', () => {
    const input = '<script>alert("XSS & \'injection\'");</script>';
    const result = escapeHtml(input);

    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&quot;');
    expect(result).toContain('&#x27;');
  });

  it('should preserve safe text without special characters', () => {
    const input = 'Hello world 123';
    const result = escapeHtml(input);

    expect(result).toBe('Hello world 123');
  });

  it('should return empty string for empty input', () => {
    const result = escapeHtml('');

    expect(result).toBe('');
  });
});

describe('sanitizeRichText', () => {
  it('should remove script tags and their content', () => {
    const input = '<p>Hello <script>alert("XSS")</script> World</p>';
    const result = sanitizeRichText(input);

    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should remove event handlers from elements', () => {
    const input = '<div onclick="alert(1)">Click me</div><img onerror="alert(2)" src="x">';
    const result = sanitizeRichText(input);

    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
    expect(result).toContain('Click me');
  });

  it('should remove dangerous tags', () => {
    const input = '<p>Safe</p><iframe src="evil.com"></iframe><object data="evil"></object><form action="/evil"><input type="text"></form>';
    const result = sanitizeRichText(input);

    expect(result).toContain('Safe');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<object');
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
  });

  it('should remove javascript: protocol', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeRichText(input);

    expect(result).not.toContain('javascript:');
  });

  it('should preserve safe HTML tags', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeRichText(input);

    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should return empty string for null/undefined input', () => {
    expect(sanitizeRichText(null)).toBe('');
    expect(sanitizeRichText(undefined)).toBe('');
  });
});

describe('sanitizeInput', () => {
  it('should preserve safe HTML with type=rich', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeInput(input, { type: 'rich' });

    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
  });

  it('should strip all HTML with type=plain', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeInput(input, { type: 'plain' });

    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<strong>');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
  });

  it('should truncate to maxLength when specified', () => {
    const input = 'This is a very long string that should be truncated';
    const result = sanitizeInput(input, { type: 'plain', maxLength: 20 });

    expect(result.length).toBe(20);
    expect(result).toBe('This is a very long ');
  });

  it('should return empty string for null/undefined input', () => {
    expect(sanitizeInput(null, { type: 'plain' })).toBe('');
    expect(sanitizeInput(undefined, { type: 'plain' })).toBe('');
  });
});

describe('isSafeContent', () => {
  it('should return true for safe HTML', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = isSafeContent(input);

    expect(result).toBe(true);
  });

  it('should return false for script tags', () => {
    const input = '<script>alert("XSS")</script>';
    const result = isSafeContent(input);

    expect(result).toBe(false);
  });

  it('should return false for javascript: protocol', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = isSafeContent(input);

    expect(result).toBe(false);
  });

  it('should return false for event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const result = isSafeContent(input);

    expect(result).toBe(false);
  });

  it('should return true for empty string', () => {
    const result = isSafeContent('');

    expect(result).toBe(true);
  });
});
