import { useEffect, useId, useRef, useState } from "react";
import { Paper, Box, IconButton, Tooltip } from "@mui/material";
import {
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  Maximize as MaximizeIcon,
} from "@mui/icons-material";
import { floatingModalStyles } from "./FloatingModal.styles";
import type { FloatingModalProps } from "./FloatingModal.types";

export default function FloatingModal({
  isOpen,
  onClose,
  title,
  children,
  renderContent,
  toolbar,
  initialWidth = 600,
  initialHeight = 500,
  initialX = 100,
  initialY = 100,
}: FloatingModalProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    modalRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("input")
    ) {
      return;
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Paper
      ref={modalRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-testid="floating-modal"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onKeyDown={handleKeyDown}
      sx={floatingModalStyles.modal(
        isMinimized,
        isDragging,
        position,
        initialWidth,
        initialHeight,
      )}
    >
      {/* Header - Draggable */}
      <Box
        data-testid="floating-modal-header"
        onMouseDown={handleMouseDown}
        sx={floatingModalStyles.header(isDragging)}
      >
        <Box component="h2" id={titleId} sx={floatingModalStyles.title}>
          {title}
        </Box>
        <Box>
          <Tooltip title={isMinimized ? "Maximizar" : "Minimizar"}>
            <IconButton
              aria-label={isMinimized ? "Maximizar" : "Minimizar"}
              size="small"
              onClick={() => setIsMinimized(!isMinimized)}
              sx={floatingModalStyles.actionButton}
            >
              {isMinimized ? (
                <MaximizeIcon fontSize="small" />
              ) : (
                <MinimizeIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar">
            <IconButton
              aria-label="Cerrar"
              size="small"
              onClick={onClose}
              sx={floatingModalStyles.actionButton}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Toolbar - Optional */}
      {toolbar && !isMinimized && toolbar}

      {/* Content */}
      {!isMinimized && (
        <Box sx={floatingModalStyles.content}>
          {renderContent ? renderContent() : children}
        </Box>
      )}
    </Paper>
  );
}
