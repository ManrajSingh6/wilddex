import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { JSX } from "react";

interface ModalProps {
  readonly isOpen: boolean;
  readonly header?: string;
  readonly subHeader?: string;
  readonly content?: JSX.Element;
  readonly onClose: () => void;
  readonly showCloseButton?: boolean;
  readonly width?: string;
  readonly minWidth?: string;
  readonly isContentLoading?: boolean;
}

export function Modal({
  isOpen,
  header,
  subHeader,
  content,
  onClose,
  width = "w-[90%] md:max-w-lg",
  minWidth,
  isContentLoading = false,
}: ModalProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${width} ${minWidth} max-h-[95vh] overflow-hidden`}
      >
        <DialogHeader>
          <DialogTitle className="text-left text-header text-base">
            {header}
          </DialogTitle>
          <DialogDescription className="text-left text-accentText text-sm">
            {subHeader}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mb-2 mt-2 overflow-y-auto max-h-[94vh]">
          {content && (
            <div
              className={`${isContentLoading ? "opacity-50" : "opacity-100"}`}
            >
              {content}
            </div>
          )}
          {isContentLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Spinner element */}
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-teal-600" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
