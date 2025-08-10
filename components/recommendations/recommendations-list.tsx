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
  Archive,
  Edit,
  Trash2
} from "lucide-react";
import { PriorityBadge } from "@/components/ui/priority-badge";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  link?: string;
  category: string;
  price?: string;
  priority: number;
  isArchived: boolean;
  createdAt: string;
  teacherName: string;
}

interface RecommendationsListProps {
  items: Recommendation[];
  teacherId: string;
}

const categoryConfig = {
  GEAR: { 
    label: "Gear & Equipment", 
    icon: Package, 
    color: "bg-blue-50 text-blue-700 border-blue-200" 
  },
  BOOKS: { 
    label: "Books & Method Books", 
    icon: BookOpen, 
    color: "bg-green-50 text-green-700 border-green-200" 
  },
  SOFTWARE: { 
    label: "Software & Tools", 
    icon: Monitor, 
    color: "bg-purple-50 text-purple-700 border-purple-200" 
  },
  ONLINE_COURSES: { 
    label: "Online Courses", 
    icon: GraduationCap, 
    color: "bg-orange-50 text-orange-700 border-orange-200" 
  },
  APPS: { 
    label: "Mobile Apps", 
    icon: Smartphone, 
    color: "bg-pink-50 text-pink-700 border-pink-200" 
  },
  OTHER: { 
    label: "Other Resources", 
    icon: Tag, 
    color: "bg-gray-50 text-gray-700 border-gray-200" 
  },
};

const priorityConfig = {
  5: { label: "Essential", color: "bg-red-50 text-red-700 border-red-200" },
  4: { label: "High Priority", color: "bg-orange-50 text-orange-700 border-orange-200" },
  3: { label: "Recommended", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  2: { label: "Optional", color: "bg-blue-50 text-blue-700 border-blue-200" },
  1: { label: "Consider Later", color: "bg-gray-50 text-gray-700 border-gray-200" },
};


async function handleArchive(id: string) {
  try {
    const response = await fetch(`/api/recommendations/${id}/archive`, {
      method: 'POST',
    });

    if (response.ok) {
      window.location.reload(); // Simple refresh for now
    } else {
      console.error('Failed to archive recommendation');
    }
  } catch (error) {
    console.error('Error archiving recommendation:', error);
  }
}

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this recommendation? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/recommendations/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      window.location.reload(); // Simple refresh for now
    } else {
      console.error('Failed to delete recommendation');
    }
  } catch (error) {
    console.error('Error deleting recommendation:', error);
  }
}

export function RecommendationsList({ items, teacherId }: RecommendationsListProps) {
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
                <SelectItem value="1">Consider Later</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {filteredItems.length} {filteredItems.length === 1 ? 'Recommendation' : 'Recommendations'}
          </h2>
        </div>

        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No recommendations found
            </h3>
            <p className="text-muted-foreground mb-4">
              {items.length === 0 
                ? "You haven't created any recommendations yet."
                : "Try adjusting your search or filter criteria."
              }
            </p>
            <a href="/recommendations/new">
              <Button>Add First Recommendation</Button>
            </a>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((item) => {
              const categoryInfo = categoryConfig[item.category as keyof typeof categoryConfig];
              const priorityInfo = priorityConfig[item.priority as keyof typeof priorityConfig];
              const IconComponent = categoryInfo.icon;
              
              return (
                <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 bg-muted rounded-lg">
                        <IconComponent className="h-6 w-6 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
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
                                variant="secondary"
                                onClick={() => window.open(item.link, '_blank')}
                                className="flex items-center space-x-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>View</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.location.href = `/recommendations/${item.id}/edit`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleArchive(item.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                          
                          <Badge 
                            variant="secondary"
                            className={priorityInfo.color}
                          >
                            {priorityInfo.label}
                          </Badge>
                          
                          {item.price && (
                            <Badge variant="outline" className="text-xs">
                              {item.price}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-4">
                            <PriorityBadge priority={item.priority} size="sm" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Added {item.createdAt}
                          </span>
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