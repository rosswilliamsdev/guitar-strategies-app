"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, Image, Music, File } from "lucide-react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    category: string;
    description?: string;
  } | null;
  onDownload: () => void;
}

export function FilePreviewModal({ 
  isOpen, 
  onClose, 
  file, 
  onDownload 
}: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  if (!file) return null;

  const getFileType = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'txt':
        return 'text';
      case 'mid':
      case 'midi':
        return 'midi';
      case 'doc':
      case 'docx':
        return 'document';
      default:
        return 'unknown';
    }
  };

  const fileType = getFileType(file.fileName);
  const fileSize = (file.fileSize / 1024 / 1024).toFixed(2);

  const renderPreview = () => {
    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-muted/50 rounded-lg">
          <File className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">Preview not available</p>
          <p className="text-sm text-muted-foreground">Click download to view this file</p>
        </div>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="w-full h-96 bg-muted/50 rounded-lg overflow-hidden">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <iframe
              src={file.fileUrl}
              className="w-full h-full"
              title={file.title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setPreviewError(true);
              }}
            />
          </div>
        );

      case 'image':
        return (
          <div className="w-full bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center min-h-96">
            {isLoading && (
              <div className="absolute flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <img
              src={file.fileUrl}
              alt={file.title}
              className="max-w-full max-h-96 object-contain"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setPreviewError(true);
              }}
            />
          </div>
        );

      case 'text':
        return (
          <div className="w-full h-96 bg-muted/50 rounded-lg overflow-hidden">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <iframe
              src={file.fileUrl}
              className="w-full h-full"
              title={file.title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setPreviewError(true);
              }}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 bg-muted/50 rounded-lg">
            {fileType === 'midi' ? (
              <Music className="h-16 w-16 text-muted-foreground mb-4" />
            ) : fileType === 'document' ? (
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            ) : (
              <File className="h-16 w-16 text-muted-foreground mb-4" />
            )}
            <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
            <p className="text-sm text-muted-foreground">Click download to view this file</p>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={file.title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(file.fileUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* File Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border pb-4">
          <div>
            <span className="font-medium text-foreground">{file.fileName}</span>
            <span className="ml-2">• {fileSize} MB</span>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide">{file.category.replace('_', ' ')}</div>
          </div>
        </div>

        {/* Description */}
        {file.description && (
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Description:</p>
            <p className="text-muted-foreground">{file.description}</p>
          </div>
        )}

        {/* Preview */}
        <div>
          <p className="font-medium text-foreground mb-2 text-sm">Preview:</p>
          {renderPreview()}
        </div>
      </div>
    </Modal>
  );
}