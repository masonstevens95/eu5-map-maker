import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DropZone } from "../DropZone";

describe("DropZone", () => {
  it("renders upload prompt when not loading", () => {
    render(<DropZone loading={false} loadingMessage="" onFile={() => {}} />);
    expect(screen.getByText(/Drop an EU5 save file/)).toBeInTheDocument();
  });

  it("renders file input", () => {
    const { container } = render(<DropZone loading={false} loadingMessage="" onFile={() => {}} />);
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("shows spinner and message when loading", () => {
    const { container } = render(<DropZone loading={true} loadingMessage="Parsing..." onFile={() => {}} />);
    expect(screen.getByText("Parsing...")).toBeInTheDocument();
    expect(container.querySelector(".spinner")).toBeInTheDocument();
    expect(container.querySelector(".drop-icon")).not.toBeInTheDocument();
  });

  it("calls onFile when file is selected via input", () => {
    const onFile = vi.fn();
    const { container } = render(<DropZone loading={false} loadingMessage="" onFile={onFile} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "save.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("calls onFile when file is dropped", () => {
    const onFile = vi.fn();
    const { container } = render(<DropZone loading={false} loadingMessage="" onFile={onFile} />);
    const zone = container.querySelector(".drop-zone")!;
    const file = new File(["test"], "save.txt", { type: "text/plain" });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("applies loading class when loading", () => {
    const { container } = render(<DropZone loading={true} loadingMessage="Loading..." onFile={() => {}} />);
    expect(container.querySelector(".drop-zone")).toHaveClass("loading");
  });

  it("does not apply loading class when idle", () => {
    const { container } = render(<DropZone loading={false} loadingMessage="" onFile={() => {}} />);
    expect(container.querySelector(".drop-zone")).not.toHaveClass("loading");
  });
});
