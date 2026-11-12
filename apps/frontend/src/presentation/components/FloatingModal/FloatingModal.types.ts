import type { ReactNode } from "react";

export interface FloatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  renderContent?: () => ReactNode;
  toolbar?: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
}
