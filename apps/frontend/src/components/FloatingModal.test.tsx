import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FloatingModal from "./FloatingModal";

describe("FloatingModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <FloatingModal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>,
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should display the title", () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="My Modal">
        <div>Content</div>
      </FloatingModal>,
    );
    expect(screen.getByText("My Modal")).toBeInTheDocument();
  });

  it("should render children content", () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Test Content</div>
      </FloatingModal>,
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should toggle minimize state when minimize button is clicked", () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Minimizar" }));
    expect(screen.queryByText("Content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Maximizar" }));
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should be draggable", () => {
    const { container } = render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>,
    );

    const header = container.querySelector(
      '[data-testid="floating-modal-header"]',
    );
    expect(header).toHaveStyle("cursor: grab");
  });

  it("should accept custom initial width and height", () => {
    render(
      <FloatingModal
        isOpen={true}
        onClose={mockOnClose}
        title="Test Modal"
        initialWidth={800}
        initialHeight={400}
      >
        <div>Content</div>
      </FloatingModal>,
    );

    const modal = screen.getByRole("dialog");
    expect(modal).toHaveStyle({ width: "800px", height: "400px" });
  });

  it("should accept custom initial position", () => {
    render(
      <FloatingModal
        isOpen={true}
        onClose={mockOnClose}
        title="Test Modal"
        initialX={200}
        initialY={300}
      >
        <div>Content</div>
      </FloatingModal>,
    );

    const modal = screen.getByRole("dialog");
    expect(modal).toHaveStyle({ left: "200px", top: "300px" });
  });

  it("should have fixed positioning", () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>,
    );

    expect(screen.getByRole("dialog")).toHaveStyle({ position: "fixed" });
  });

  it("should have high z-index", () => {
    render(
      <FloatingModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </FloatingModal>,
    );

    expect(screen.getByRole("dialog")).toHaveStyle({ zIndex: "1300" });
  });
});
