import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stat } from "../Stat";

describe("Stat", () => {
  it("renders label and value", () => {
    render(<Stat label="Countries" value="42" />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();
  });

  it("applies correct class names", () => {
    const { container } = render(<Stat label="Test" value="0" />);
    expect(container.querySelector(".stat-value")).toHaveTextContent("0");
    expect(container.querySelector(".stat-label")).toHaveTextContent("Test");
  });
});
