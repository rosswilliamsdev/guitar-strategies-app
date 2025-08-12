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
}

const categoryConfig = {
  TABLATURE: { 
    label: "Tablature", 
    icon: FileText, 
    color: "bg-green-50 text-green-700 border-green-200" 
  },
  SHEET_MUSIC: { 
    label: "Sheet Music", 
    icon: Music, 
    color: "bg-blue-50 text-blue-700 border-blue-200" 
  },
  CHORD_CHARTS: { 
    label: "Chord Charts", 
    icon: Target, 
    color: "bg-purple-50 text-purple-700 border-purple-200" 
  },
  SCALES: { 
    label: "Scales", 
    icon: Music, 
    color: "bg-cyan-50 text-cyan-700 border-cyan-200" 
  },
  ETUDES: { 
    label: "Etudes", 
    icon: BookOpen, 
    color: "bg-teal-50 text-teal-700 border-teal-200" 
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

export function LibraryList({ items }: LibraryListProps) {
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const categoryInfo = categoryConfig[item.category as keyof typeof categoryConfig];
              const IconComponent = categoryInfo.icon;
              
              return (
                <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-muted rounded">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground truncate">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => handleDownload(item)}
                          className="flex-shrink-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <Badge 
                          className={`text-xs ${categoryInfo.color}`}
                        >
                          {categoryInfo.label}
                        </Badge>
                        
                        {item.difficulty && (
                          <Badge 
                            className={`text-xs ${difficultyColors[item.difficulty as keyof typeof difficultyColors]}`}
                          >
                            {item.difficulty.toLowerCase()}
                          </Badge>
                        )}
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