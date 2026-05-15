import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatingModal from './FloatingModal';

describe('FloatingModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <FloatingModal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should display the title', () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="My Modal">
        <div>Content</div>
      </FloatingModal>
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Test Content</div>
      </FloatingModal>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>
    );

    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find((btn) => btn.getAttribute('title') === 'Cerrar');
    
    fireEvent.click(closeButton!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should toggle minimize state when minimize button is clicked', () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>
    );

    const minimizeButtons = screen.getAllByRole('button');
    const minimizeButton = minimizeButtons.find((btn) => 
      btn.getAttribute('title') === 'Minimizar' || btn.getAttribute('title') === 'Maximizar'
    );

    expect(screen.getByText('Content')).toBeInTheDocument();

    fireEvent.click(minimizeButton!);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    fireEvent.click(minimizeButton!);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should be draggable', () => {
    const { container } = render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>
    );

    const header = container.querySelector('div[style*="primary"]');
    expect(header).toHaveStyle('cursor: grab');
  });

  it('should accept custom initial width and height', () => {
    const { container } = render(
      <FloatingModal
        isOpen={true}
        onClose={mockOnClose}
        title="Test Modal"
        initialWidth={800}
        initialHeight={400}
      >
        <div>Content</div>
      </FloatingModal>
    );

    const modal = container.firstChild as HTMLElement;
    expect(modal.style.width).toContain('800px');
    expect(modal.style.height).toContain('400px');
  });

  it('should accept custom initial position', () => {
    const { container } = render(
      <FloatingModal
        isOpen={true}
        onClose={mockOnClose}
        title="Test Modal"
        initialX={200}
        initialY={300}
      >
        <div>Content</div>
      </FloatingModal>
    );

    const modal = container.firstChild as HTMLElement;
    expect(modal.style.left).toContain('200px');
    expect(modal.style.top).toContain('300px');
  });

  it('should have fixed positioning', () => {
    const { container } = render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>
    );

    const modal = container.firstChild as HTMLElement;
    expect(modal.style.position).toBe('fixed');
  });

  it('should have high z-index', () => {
    const { container } = render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>
    );

    const modal = container.firstChild as HTMLElement;
    expect(modal.style.zIndex).toBe('1300');
  });
});
