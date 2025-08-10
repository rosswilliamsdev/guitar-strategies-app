"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Download, 
  FileText, 
  Music, 
  Video, 
  Headphones, 
  BookOpen, 
  Target,
  Search,
  Filter
} from "lucide-react";

interface LibraryItem {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  category: string;
  difficulty?: string;
  tags: string[];
  downloadCount: number;
  isPublic: boolean;
  createdAt: string;
  teacherName: string;
}

interface LibraryListProps {
  items: LibraryItem[];
  teacherId: string;
}

const categoryConfig = {
  SHEET_MUSIC: { 
    label: "Sheet Music", 
    icon: Music, 
    color: "bg-blue-50 text-blue-700 border-blue-200" 
  },
  TAB: { 
    label: "Guitar Tabs", 
    icon: FileText, 
    color: "bg-green-50 text-green-700 border-green-200" 
  },
  CHORD_CHARTS: { 
    label: "Chord Charts", 
    icon: Target, 
    color: "bg-purple-50 text-purple-700 border-purple-200" 
  },
  EXERCISES: { 
    label: "Exercises", 
    icon: Target, 
    color: "bg-orange-50 text-orange-700 border-orange-200" 
  },
  THEORY: { 
    label: "Music Theory", 
    icon: BookOpen, 
    color: "bg-indigo-50 text-indigo-700 border-indigo-200" 
  },
  AUDIO: { 
    label: "Audio Files", 
    icon: Headphones, 
    color: "bg-pink-50 text-pink-700 border-pink-200" 
  },
  VIDEO: { 
    label: "Video Files", 
    icon: Video, 
    color: "bg-red-50 text-red-700 border-red-200" 
  },
  OTHER: { 
    label: "Other", 
    icon: FileText, 
    color: "bg-gray-50 text-gray-700 border-gray-200" 
  },
};

const difficultyColors = {
  BEGINNER: "bg-green-50 text-green-700 border-green-200",
  INTERMEDIATE: "bg-yellow-50 text-yellow-700 border-yellow-200", 
  ADVANCED: "bg-orange-50 text-orange-700 border-orange-200",
  PROFESSIONAL: "bg-red-50 text-red-700 border-red-200",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function handleDownload(item: LibraryItem) {
  try {
    // Increment download count
    await fetch(`/api/library/${item.id}/download`, { method: 'POST' });
    
    // Download the file
    const link = document.createElement('a');
    link.href = item.fileUrl;
    link.download = item.fileName;
    link.click();
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

export function LibraryList({ items, teacherId }: LibraryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === "all" || item.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [items, searchTerm, selectedCategory, selectedDifficulty]);

  const categories = Object.keys(categoryConfig);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {categoryConfig[category as keyof typeof categoryConfig].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="BEGINNER">Beginner</SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                <SelectItem value="ADVANCED">Advanced</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {filteredItems.length} {filteredItems.length === 1 ? 'Resource' : 'Resources'}
          </h2>
        </div>

        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No resources found
            </h3>
            <p className="text-muted-foreground mb-4">
              {items.length === 0 
                ? "You haven't uploaded any resources yet."
                : "Try adjusting your search or filter criteria."
              }
            </p>
            <a href="/library/upload">
              <Button>Upload First Resource</Button>
            </a>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((item) => {
              const categoryInfo = categoryConfig[item.category as keyof typeof categoryConfig];
              const IconComponent = categoryInfo.icon;
              
              return (
                <Card key={item.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 bg-muted rounded-lg">
                        <IconComponent className="h-6 w-6 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleDownload(item)}
                              className="flex items-center space-x-2"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download</span>
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge 
                            variant="secondary" 
                            className={categoryInfo.color}
                          >
                            {categoryInfo.label}
                          </Badge>
                          
                          {item.difficulty && (
                            <Badge 
                              variant="secondary"
                              className={difficultyColors[item.difficulty as keyof typeof difficultyColors]}
                            >
                              {item.difficulty.toLowerCase()}
                            </Badge>
                          )}
                          
                          {item.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <span>{item.fileName}</span>
                            <span>{formatFileSize(item.fileSize)}</span>
                            <span>{item.downloadCount} downloads</span>
                          </div>
                          <span>Uploaded {item.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}