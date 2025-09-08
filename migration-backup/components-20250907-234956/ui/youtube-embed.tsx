'use client';

interface YouTubeEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

export function YouTubeEmbed({ url, title = 'YouTube video', className = '' }: YouTubeEmbedProps) {
  const videoId = getYouTubeVideoId(url);
  
  if (!videoId) {
    return (
      <div className={`bg-muted p-4 rounded-lg text-center ${className}`}>
        <p className="text-muted-foreground">Invalid YouTube URL</p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}