"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  UploadCloud,
  FolderOpen
} from "lucide-react";

interface BulkUploadFile {
  id: string;
  file: File;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface LibraryBulkUploadProps {
  teacherId: string;
}

const categories = [
  { value: "TABLATURE", label: "Tablature" },
  { value: "SHEET_MUSIC", label: "Sheet Music" },
  { value: "CHORD_CHARTS", label: "Chord Charts" },
  { value: "SCALES", label: "Scales" },
  { value: "ETUDES", label: "Etudes" },
  { value: "EXERCISES", label: "Exercises" },
  { value: "THEORY", label: "Music Theory" },
  { value: "OTHER", label: "Other" },
];

const allowedFileTypes = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".midi",
  ".mid",
];

export function LibraryBulkUpload({ teacherId }: LibraryBulkUploadProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string>("");
  const [files, setFiles] = useState<BulkUploadFile[]>([]);
  
  // Bulk settings that apply to all files
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles: BulkUploadFile[] = [];
    let hasErrors = false;

    selectedFiles.forEach((file) => {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setGlobalError("One or more files exceed the 10MB size limit");
        hasErrors = true;
        return;
      }

      // Validate file type
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedFileTypes.includes(fileExtension)) {
        setGlobalError(
          `File type not supported: ${file.name}. Allowed types: ${allowedFileTypes.join(", ")}`
        );
        hasErrors = true;
        return;
      }

      // Generate filename without extension as default title
      const defaultTitle = file.name.split(".").slice(0, -1).join(".");

      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        title: defaultTitle,
        description: bulkDescription,
        category: bulkCategory,
        status: 'pending'
      });
    });

    if (!hasErrors) {
      setFiles(prev => [...prev, ...newFiles]);
      setGlobalError("");
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<BulkUploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const applyBulkSettings = () => {
    setFiles(prev => prev.map(f => ({
      ...f,
      category: bulkCategory || f.category,
      description: bulkDescription || f.description
    })));
  };

  const uploadSingleFile = async (fileData: BulkUploadFile): Promise<boolean> => {
    try {
      updateFile(fileData.id, { status: 'uploading' });

      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('title', fileData.title);
      formData.append('description', fileData.description);
      formData.append('category', fileData.category);
      formData.append('isPublic', 'true');

      const response = await fetch('/api/library/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        updateFile(fileData.id, { status: 'success' });
        return true;
      } else {
        updateFile(fileData.id, { 
          status: 'error', 
          error: result.error || 'Upload failed' 
        });
        return false;
      }
    } catch (error) {
      updateFile(fileData.id, { 
        status: 'error', 
        error: 'Network error or server unavailable' 
      });
      return false;
    }
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) {
      setGlobalError("Please select files to upload");
      return;
    }

    // Validate that all files have required fields
    const invalidFiles = files.filter(f => !f.category);
    if (invalidFiles.length > 0) {
      setGlobalError("All files must have a category selected");
      return;
    }

    setIsUploading(true);
    setGlobalError("");

    // Upload files concurrently (max 3 at a time to avoid overwhelming the server)
    const batchSize = 3;
    const batches: BulkUploadFile[][] = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    let successCount = 0;
    
    for (const batch of batches) {
      const promises = batch.map(uploadSingleFile);
      const results = await Promise.all(promises);
      successCount += results.filter(Boolean).length;
    }

    setIsUploading(false);
    
    if (successCount === files.length) {
      // All uploads successful
      router.push("/library");
    } else {
      setGlobalError(`${successCount}/${files.length} files uploaded successfully. Check individual file errors below.`);
    }
  };

  const getStatusIcon = (status: BulkUploadFile['status']) => {
    switch (status) {
      case 'pending': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'uploading': return <UploadCloud className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {globalError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{globalError}</span>
        </div>
      )}

      {/* File Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Select Files</h2>
        <div className="space-y-4">
          <label
            htmlFor="bulk-files"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center">
              <FolderOpen className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Click to select multiple files</span>
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, images, MIDI files (max 10MB each)
              </p>
            </div>
            <input
              id="bulk-files"
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesSelect}
              accept={allowedFileTypes.join(",")}
            />
          </label>
          
          <p className="text-sm text-muted-foreground">
            Selected: {files.length} files
          </p>
        </div>
      </Card>

      {/* Bulk Settings */}
      {files.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Apply Settings to All Files
          </h2>
          <div className="mb-4">
            <Label>Default Category</Label>
            <Select value={bulkCategory} onValueChange={setBulkCategory}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="mb-4">
            <Label>Default Description</Label>
            <Textarea
              value={bulkDescription}
              onChange={(e) => setBulkDescription(e.target.value)}
              placeholder="Description to apply to all files"
              className="mt-2"
              rows={2}
            />
          </div>
          
          <Button onClick={applyBulkSettings} variant="secondary">
            Apply to All Files
          </Button>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Files to Upload ({files.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {files.map((fileData) => (
              <div key={fileData.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(fileData.status)}
                    <div>
                      <p className="font-medium text-sm">{fileData.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeFile(fileData.id)}
                    disabled={fileData.status === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {fileData.status === 'error' && fileData.error && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    Error: {fileData.error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={fileData.title}
                      onChange={(e) => updateFile(fileData.id, { title: e.target.value })}
                      placeholder="File title"
                      className="mt-1"
                      disabled={fileData.status === 'uploading'}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select 
                      value={fileData.category} 
                      onValueChange={(value) => updateFile(fileData.id, { category: value })}
                      disabled={fileData.status === 'uploading'}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {files.filter(f => f.status === 'success').length} uploaded, {files.filter(f => f.status === 'error').length} failed
            </div>
            <Button 
              onClick={handleBulkUpload}
              disabled={isUploading || files.length === 0}
              className="px-6"
            >
              {isUploading ? (
                <>
                  <UploadCloud className="h-4 w-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {files.length} Files
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}