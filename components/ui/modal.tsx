"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Modal component that wraps shadcn/ui Dialog for backward compatibility.
 * Maintains the same API as the original Modal component while using Dialog under the hood.
 */
export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = "md" 
}: ModalProps) {
  // Map size prop to Dialog className
  const sizeClasses = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg", 
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl"
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={sizeClasses[size]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
        {footer && (
          <DialogFooter>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}