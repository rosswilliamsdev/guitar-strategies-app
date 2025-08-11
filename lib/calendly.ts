/**
 * Calendly URL validation and formatting utilities
 */

export function validateCalendlyUrl(url: string): { isValid: boolean; error?: string; cleanUrl?: string } {
  if (!url.trim()) {
    return { isValid: true }; // Empty URL is valid (optional field)
  }

  const trimmedUrl = url.trim();

  try {
    // Handle different formats
    let cleanUrl = trimmedUrl;

    // If it starts with just the username, add the full URL
    if (!cleanUrl.includes('/') && !cleanUrl.includes('.')) {
      cleanUrl = `https://calendly.com/${cleanUrl}`;
    }
    
    // If it starts with calendly.com/, add https://
    if (cleanUrl.startsWith('calendly.com/')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // If it doesn't start with http, assume it's missing protocol
    if (!cleanUrl.startsWith('http')) {
      if (cleanUrl.includes('calendly.com/')) {
        cleanUrl = `https://${cleanUrl}`;
      } else {
        return { isValid: false, error: 'URL must start with https:// or be a calendly.com link' };
      }
    }

    // Parse the URL to validate format
    const parsedUrl = new URL(cleanUrl);
    
    // Must be calendly.com
    if (!parsedUrl.hostname.includes('calendly.com')) {
      return { isValid: false, error: 'URL must be from calendly.com' };
    }

    // Must have a path (username/event)
    if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
      return { isValid: false, error: 'URL must include your Calendly username or event' };
    }

    // Remove any query parameters or fragments for the clean URL
    const cleanedUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;

    return { isValid: true, cleanUrl: cleanedUrl };

  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

export function extractCalendlyUsername(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.includes('calendly.com')) return null;
    
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    return pathParts[0] || null;
  } catch {
    return null;
  }
}

export function getCalendlyExamples(): string[] {
  return [
    'https://calendly.com/your-username',
    'https://calendly.com/your-username/guitar-lessons',
    'calendly.com/your-username',
    'your-username'
  ];
}