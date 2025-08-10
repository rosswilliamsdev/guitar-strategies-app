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
  ExternalLink, 
  Package,
  BookOpen,
  Monitor,
  GraduationCap,
  Smartphone,
  Tag,
  Search,
  Filter,
  Heart,
  ShoppingCart
} from "lucide-react";
import { PriorityBadge } from "@/components/ui/priority-badge";

interface StudentRecommendation {
  id: string;
  title: string;
  description: string;
  link?: string;
  category: string;
  price?: string;
  priority: number;
  isArchived: boolean;
  createdAt: string;
}

interface StudentRecommendationsListProps {
  items: StudentRecommendation[];
  teacherName: string;
}

const categoryConfig = {
  GEAR: { 
    label: "Gear & Equipment", 
    icon: Package, 
    color: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Instruments, amps, pedals, and accessories"
  },
  BOOKS: { 
    label: "Books & Method Books", 
    icon: BookOpen, 
    color: "bg-green-50 text-green-700 border-green-200",
    description: "Learning materials and instructional books"
  },
  SOFTWARE: { 
    label: "Software & Tools", 
    icon: Monitor, 
    color: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Recording software and digital tools"
  },
  ONLINE_COURSES: { 
    label: "Online Courses", 
    icon: GraduationCap, 
    color: "bg-orange-50 text-orange-700 border-orange-200",
    description: "Video lessons and online learning"
  },
  APPS: { 
    label: "Mobile Apps", 
    icon: Smartphone, 
    color: "bg-pink-50 text-pink-700 border-pink-200",
    description: "Helpful mobile applications"
  },
  OTHER: { 
    label: "Other Resources", 
    icon: Tag, 
    color: "bg-gray-50 text-gray-700 border-gray-200",
    description: "Miscellaneous helpful resources"
  },
};

const priorityConfig = {
  5: { label: "Essential", color: "bg-red-50 text-red-700 border-red-200", description: "Must have - start here!" },
  4: { label: "High Priority", color: "bg-orange-50 text-orange-700 border-orange-200", description: "Strongly recommended" },
  3: { label: "Recommended", color: "bg-yellow-50 text-yellow-700 border-yellow-200", description: "Good to have" },
  2: { label: "Optional", color: "bg-blue-50 text-blue-700 border-blue-200", description: "Nice to have" },
  1: { label: "Future", color: "bg-gray-50 text-gray-700 border-gray-200", description: "Consider later" },
};


function PriorityBadge({ priority }: { priority: number }) {
  const config = priorityConfig[priority as keyof typeof priorityConfig];
  return (
    <Badge 
      variant="secondary"
      className={config.color}
      title={config.description}
    >
      {config.label}
    </Badge>
  );
}

export function StudentRecommendationsList({ items, teacherName }: StudentRecommendationsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesPriority = selectedPriority === "all" || item.priority.toString() === selectedPriority;
      
      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [items, searchTerm, selectedCategory, selectedPriority]);

  // Sort by priority (highest first), then by creation date
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredItems]);

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
                placeholder="Search recommendations..."
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
            
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="5">Essential</SelectItem>
                <SelectItem value="4">High Priority</SelectItem>
                <SelectItem value="3">Recommended</SelectItem>
                <SelectItem value="2">Optional</SelectItem>
                <SelectItem value="1">Future</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {sortedItems.length} {sortedItems.length === 1 ? 'Recommendation' : 'Recommendations'}
          </h2>
          {sortedItems.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Sorted by priority (highest first)
            </p>
          )}
        </div>

        {sortedItems.length === 0 ? (
          <Card className="p-8 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No recommendations found
            </h3>
            <p className="text-muted-foreground mb-4">
              {items.length === 0 
                ? `${teacherName} hasn't created any recommendations yet.`
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sortedItems.map((item) => {
              const categoryInfo = categoryConfig[item.category as keyof typeof categoryConfig];
              const IconComponent = categoryInfo.icon;
              
              return (
                <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <IconComponent className="h-6 w-6 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {item.link && (
                            <Button
                              size="sm"
                              onClick={() => window.open(item.link, '_blank')}
                              className="flex items-center space-x-2"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              <span>View/Buy</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge 
                          variant="secondary" 
                          className={categoryInfo.color}
                          title={categoryInfo.description}
                        >
                          {categoryInfo.label}
                        </Badge>
                        
                        <PriorityBadge priority={item.priority} />
                        
                        {item.price && (
                          <Badge variant="outline" className="text-xs">
                            {item.price}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <PriorityBadge priority={item.priority} size="sm" />
                          <span className="text-muted-foreground">
                            {priorityConfig[item.priority as keyof typeof priorityConfig].description}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          Added {item.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      {sortedItems.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Priority Levels</h3>
          <div className="flex flex-wrap gap-3">
            {[5, 4, 3, 2, 1].map((level) => (
              <PriorityBadge key={level} priority={level} size="sm" />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}