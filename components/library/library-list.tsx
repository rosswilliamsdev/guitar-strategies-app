"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileText,
  Music,
  BookOpen,
  Target,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FilePreviewModal } from "./file-preview-modal";
import { log } from "@/lib/logger";

interface LibraryItem {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  category: string | null;
  difficulty?: string;
  tags: string[];
  downloadCount: number;
  isPublic: boolean;
  createdAt: string;
  teacherName: string;
  instrument?: string | null;
}

interface LibraryListProps {
  items: LibraryItem[];
}

const categoryConfig = {
  TABLATURE: {
    label: "Tablature",
    icon: FileText,
    color: "bg-green-50 text-green-700 border-green-200",
  },
  SHEET_MUSIC: {
    label: "Sheet Music",
    icon: Music,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CHORD_CHARTS: {
    label: "Chord Charts",
    icon: Target,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  SCALES: {
    label: "Scales",
    icon: Music,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  ETUDES: {
    label: "Etudes",
    icon: BookOpen,
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  EXERCISES: {
    label: "Exercises",
    icon: Target,
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  THEORY: {
    label: "Music Theory",
    icon: BookOpen,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  OTHER: {
    label: "Other",
    icon: FileText,
    color: "bg-gray-50 text-gray-700 border-gray-200",
  },
};

async function handleDownload(item: LibraryItem) {
  try {
    // Increment download count
    await fetch(`/api/library/${item.id}/download`, { method: "POST" });

    // Download the file
    const link = document.createElement("a");
    link.href = item.fileUrl;
    link.download = item.fileName;
    link.click();
  } catch (error) {
    log.error("Error downloading file:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

export function LibraryList({ items }: LibraryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [mouseDownTime, setMouseDownTime] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<
    "name" | "fileType" | "instrument"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [previewFile, setPreviewFile] = useState<LibraryItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesInstrument =
        selectedInstrument === "all" || item.instrument === selectedInstrument;

      return matchesSearch && matchesCategory && matchesInstrument;
    });

    // Sort the filtered items
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "name":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "fileType":
          // Get file extension from fileName
          aValue = a.fileName.split(".").pop()?.toLowerCase() || "";
          bValue = b.fileName.split(".").pop()?.toLowerCase() || "";
          break;
        case "instrument":
          aValue = (a.instrument || "Not specified").toLowerCase();
          bValue = (b.instrument || "Not specified").toLowerCase();
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      // All our sort columns now use strings
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

    return sorted;
  }, [
    items,
    searchTerm,
    selectedCategory,
    selectedInstrument,
    sortColumn,
    sortDirection,
  ]);

  const categories = Object.keys(categoryConfig);

  const handleSort = (
    column: "name" | "fileType" | "instrument",
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    if (sortColumn === column) {
      // Same column clicked, toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column clicked, set to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: "name" | "fileType" | "instrument") => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const handleItemClick = (itemId: string, event: React.MouseEvent) => {
    // Don't handle click if we just finished dragging
    if (isDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.metaKey || event.ctrlKey) {
      // Cmd/Ctrl+click: toggle selection
      setSelectedItems((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId]
      );
    } else if (event.shiftKey && selectedItems.length > 0) {
      // Shift+click: select range
      const currentIndex = filteredItems.findIndex(
        (item) => item.id === itemId
      );
      const lastSelectedIndex = filteredItems.findIndex((item) =>
        selectedItems.includes(item.id)
      );

      if (currentIndex !== -1 && lastSelectedIndex !== -1) {
        const start = Math.min(currentIndex, lastSelectedIndex);
        const end = Math.max(currentIndex, lastSelectedIndex);
        const rangeIds = filteredItems
          .slice(start, end + 1)
          .map((item) => item.id);
        setSelectedItems((prev) => [...new Set([...prev, ...rangeIds])]);
      }
    } else {
      // Regular click: select only this item
      setSelectedItems([itemId]);
    }
  };

  const handleDoubleClick = (item: LibraryItem) => {
    setPreviewFile(item);
  };

  const handlePreviewDownload = () => {
    if (previewFile) {
      handleDownload(previewFile);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    setMouseDownTime(Date.now());
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragEnd({ x: event.clientX, y: event.clientY });

    // Clear selection if not holding Cmd/Ctrl and clicking on empty space
    const target = event.target as HTMLElement;
    if (!target.closest("[data-item-id]") && !event.metaKey && !event.ctrlKey) {
      setSelectedItems([]);
    }
  };

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (dragStart) {
        const distance = Math.sqrt(
          Math.pow(event.clientX - dragStart.x, 2) +
            Math.pow(event.clientY - dragStart.y, 2)
        );

        // Start dragging if mouse has moved more than 5 pixels
        if (distance > 5 && !isDragging) {
          setIsDragging(true);
        }

        if (isDragging) {
          setDragEnd({ x: event.clientX, y: event.clientY });

          // Calculate selection rectangle and select items within it
          if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const selectionRect = {
              left: Math.min(dragStart.x, event.clientX) - containerRect.left,
              top: Math.min(dragStart.y, event.clientY) - containerRect.top,
              right: Math.max(dragStart.x, event.clientX) - containerRect.left,
              bottom: Math.max(dragStart.y, event.clientY) - containerRect.top,
            };

            const itemElements =
              containerRef.current.querySelectorAll("[data-item-id]");
            const selectedIds: string[] = [];

            itemElements.forEach((element) => {
              const rect = element.getBoundingClientRect();
              const relativeRect = {
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                right: rect.right - containerRect.left,
                bottom: rect.bottom - containerRect.top,
              };

              // Check if item intersects with selection rectangle
              if (
                relativeRect.left < selectionRect.right &&
                relativeRect.right > selectionRect.left &&
                relativeRect.top < selectionRect.bottom &&
                relativeRect.bottom > selectionRect.top
              ) {
                const itemId = element.getAttribute("data-item-id");
                if (itemId) selectedIds.push(itemId);
              }
            });

            setSelectedItems(selectedIds);
          }
        }
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    // Small delay to let drag selection complete before allowing clicks
    setTimeout(() => {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }, 50);
  }, []);

  // Add event listeners for drag selection
  useEffect(() => {
    if (dragStart) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragStart, handleMouseMove, handleMouseUp]);

  const handleBulkDownload = async () => {
    const selectedItemsData = items.filter((item) =>
      selectedItems.includes(item.id)
    );

    for (const item of selectedItemsData) {
      try {
        // Increment download count
        await fetch(`/api/library/${item.id}/download`, { method: "POST" });

        // Download the file
        const link = document.createElement("a");
        link.href = item.fileUrl;
        link.download = item.fileName;
        link.click();

        // Small delay between downloads to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        log.error("Error downloading file:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          fileName: item.title,
        });
      }
    }

    setSelectedItems([]);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);

    try {
      const deletePromises = selectedItems.map((itemId) =>
        fetch(`/api/library/${itemId}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      // Refresh the page to update the list
      window.location.reload();
    } catch (error) {
      log.error("Error deleting files:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setSelectedItems([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {
                      categoryConfig[category as keyof typeof categoryConfig]
                        .label
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedInstrument}
              onValueChange={setSelectedInstrument}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Instruments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instruments</SelectItem>
                <SelectItem value="GUITAR">Guitar</SelectItem>
                <SelectItem value="BASS">Bass</SelectItem>
                <SelectItem value="UKULELE">Ukulele</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "Resource" : "Resources"}
            </h2>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} selected
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkDownload}
                  className="h-8"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-8"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
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
                : "Try adjusting your search or filter criteria."}
            </p>
            <a href="/library/upload">
              <Button>Upload First Resource</Button>
            </a>
          </Card>
        ) : (
          <div
            ref={containerRef}
            className="bg-background border border-border rounded-lg overflow-hidden relative select-none min-h-96"
            onMouseDown={handleMouseDown}
            style={{ userSelect: "none" }}
          >
            {/* Selection Rectangle */}
            {isDragging && dragStart && dragEnd && (
              <div
                className="absolute bg-primary/20 border border-primary/40 pointer-events-none z-10"
                style={{
                  left:
                    Math.min(dragStart.x, dragEnd.x) -
                    (containerRef.current?.getBoundingClientRect().left || 0),
                  top:
                    Math.min(dragStart.y, dragEnd.y) -
                    (containerRef.current?.getBoundingClientRect().top || 0),
                  width: Math.abs(dragEnd.x - dragStart.x),
                  height: Math.abs(dragEnd.y - dragStart.y),
                }}
              />
            )}

            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-8 gap-4 px-4 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <button
                className="col-span-4 flex items-center justify-between text-left hover:text-foreground transition-colors cursor-pointer"
                onClick={(e) => handleSort("name", e)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Name
                </div>
                {getSortIcon("name")}
              </button>
              <button
                className="col-span-2 flex items-center justify-between text-left hover:text-foreground transition-colors cursor-pointer"
                onClick={(e) => handleSort("fileType", e)}
              >
                <span>File Type</span>
                {getSortIcon("fileType")}
              </button>
              <button
                className="col-span-2 flex items-center justify-between text-left hover:text-foreground transition-colors cursor-pointer"
                onClick={(e) => handleSort("instrument", e)}
              >
                <span>Instrument</span>
                {getSortIcon("instrument")}
              </button>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {filteredItems.map((item, index) => {
                const category = item.category || "Tablature";
                const categoryInfo =
                  categoryConfig[category as keyof typeof categoryConfig];
                const IconComponent = categoryInfo.icon;
                const fileSize = (item.fileSize / 1024 / 1024).toFixed(1);
                const fileExtension =
                  item.fileName.split(".").pop()?.toUpperCase() || "Unknown";
                const instrumentDisplay = item.instrument
                  ? item.instrument.charAt(0).toUpperCase() +
                    item.instrument.slice(1).toLowerCase()
                  : "Not specified";

                return (
                  <div
                    key={item.id}
                    data-item-id={item.id}
                    className={`px-4 py-3 transition-colors cursor-pointer ${
                      selectedItems.includes(item.id)
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : index % 2 === 1
                        ? "bg-neutral-50/50 hover:bg-muted/30"
                        : "hover:bg-muted/30"
                    }`}
                    onClick={(e) => handleItemClick(item.id, e)}
                    onDoubleClick={() => handleDoubleClick(item)}
                  >
                    {/* Desktop Table Row */}
                    <div className="hidden md:grid grid-cols-8 gap-4 items-center">
                      {/* Name column */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <div className="p-1.5 bg-muted rounded flex-shrink-0">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`font-medium text-sm truncate ${
                              selectedItems.includes(item.id)
                                ? "text-primary"
                                : "text-foreground"
                            }`}
                          >
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* File Type column */}
                      <div className="col-span-2 flex items-center">
                        <Badge className="text-xs bg-neutral-100 text-neutral-700 border-neutral-200">
                          {fileExtension}
                        </Badge>
                      </div>

                      {/* Instrument column */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-sm text-muted-foreground">
                          {instrumentDisplay}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden flex items-center gap-3">
                      <div className="p-1.5 bg-muted rounded flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-medium text-sm truncate ${
                            selectedItems.includes(item.id)
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <Badge className="text-xs bg-neutral-100 text-neutral-700 border-neutral-200">
                            {fileExtension}
                          </Badge>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {instrumentDisplay}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Resources"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2 animate-pulse" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedItems.length}{" "}
                  {selectedItems.length === 1 ? "Resource" : "Resources"}
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="font-semibold text-foreground">Are you sure?</h3>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete the
              selected resources.
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">
            Resources to be deleted ({selectedItems.length}):
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {items
              .filter((item) => selectedItems.includes(item.id))
              .map((item) => (
                <div key={item.id} className="text-sm text-muted-foreground">
                  • {item.title}
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onDownload={handlePreviewDownload}
      />
    </div>
  );
}
