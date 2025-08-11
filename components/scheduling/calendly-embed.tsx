'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, AlertCircle } from 'lucide-react';

interface CalendlyEmbedProps {
  calendlyUrl: string;
  teacherName?: string;
  height?: number;
}

export function CalendlyEmbed({ 
  calendlyUrl, 
  teacherName = 'Teacher',
  height = 700 
}: CalendlyEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  // Validate and clean Calendly URL
  const getEmbedUrl = (url: string) => {
    try {
      // Handle different Calendly URL formats
      let cleanUrl = url.trim();
      
      // If it's a full calendly.com URL, extract the username/event
      if (cleanUrl.includes('calendly.com/')) {
        // Extract everything after calendly.com/
        const match = cleanUrl.match(/calendly\.com\/([^?#\s]+)/);
        if (match) {
          cleanUrl = `https://calendly.com/${match[1]}`;
        }
      }
      
      // Ensure it starts with https://
      if (!cleanUrl.startsWith('http')) {
        if (cleanUrl.startsWith('calendly.com/')) {
          cleanUrl = `https://${cleanUrl}`;
        } else {
          cleanUrl = `https://calendly.com/${cleanUrl}`;
        }
      }

      return cleanUrl;
    } catch (e) {
      setError('Invalid Calendly URL format');
      return '';
    }
  };

  const embedUrl = getEmbedUrl(calendlyUrl);

  useEffect(() => {
    if (!embedUrl) return;

    // Load Calendly embed script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('Failed to load Calendly widget');
    
    // Only add if not already present
    if (!document.querySelector('script[src*="calendly.com/assets/external/widget.js"]')) {
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }

    return () => {
      // Cleanup if needed (script will persist for performance)
    };
  }, [embedUrl]);

  if (!calendlyUrl) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Scheduling Not Available
        </h3>
        <p className="text-muted-foreground">
          {teacherName} hasn&apos;t set up their Calendly scheduling link yet.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900 mb-1">
              Scheduling Error
            </h3>
            <p className="text-sm text-red-800 mb-4">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(calendlyUrl, '_blank')}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open Calendly in New Tab</span>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Schedule with {teacherName}
          </h2>
          <p className="text-muted-foreground mt-1">
            Book your next guitar lesson
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.open(embedUrl, '_blank')}
          className="flex items-center space-x-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Open in New Tab</span>
        </Button>
      </div>

      {/* Calendly Widget */}
      <Card className="p-0 overflow-hidden">
        {!isLoaded && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          </div>
        )}
        
        <div 
          className="calendly-inline-widget" 
          data-url={embedUrl}
          style={{ 
            minWidth: '320px', 
            height: `${height}px`,
            display: isLoaded ? 'block' : 'none'
          }}
        />
      </Card>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Having trouble? Try{' '}
          <button
            onClick={() => window.open(embedUrl, '_blank')}
            className="text-primary hover:underline"
          >
            opening Calendly in a new tab
          </button>
        </p>
      </div>
    </div>
  );
}