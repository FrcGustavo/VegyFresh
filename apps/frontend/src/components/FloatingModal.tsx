import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Paper, Box, IconButton, Tooltip } from '@mui/material';
import { Close as CloseIcon, Minimize as MinimizeIcon, Maximize as MaximizeIcon } from '@mui/icons-material';

interface FloatingModalProps {
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
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
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
      sx={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? 300 : `${initialWidth}px`,
        height: isMinimized ? 'auto' : `${initialHeight}px`,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        boxShadow: 6,
        userSelect: isDragging ? 'none' : 'auto',
        transition: isDragging ? 'none' : 'all 0.2s',
      }}
    >
      {/* Header - Draggable */}
      <Box
        data-testid="floating-modal-header"
        onMouseDown={handleMouseDown}
        sx={{
          padding: '0.5rem 1rem',
          backgroundColor: 'primary.main',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <Box component="h2" id={titleId} sx={{ m: 0, fontSize: '1rem', fontWeight: 600 }}>
          {title}
        </Box>
        <Box>
          <Tooltip title={isMinimized ? 'Maximizar' : 'Minimizar'}>
            <IconButton
              aria-label={isMinimized ? 'Maximizar' : 'Minimizar'}
              size="small"
              onClick={() => setIsMinimized(!isMinimized)}
              sx={{ color: 'white' }}
            >
              {isMinimized ? <MaximizeIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar">
            <IconButton
              aria-label="Cerrar"
              size="small"
              onClick={onClose}
              sx={{ color: 'white' }}
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
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {renderContent ? renderContent() : children}
        </Box>
      )}
    </Paper>
  );
}
