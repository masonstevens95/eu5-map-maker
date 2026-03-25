import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Accordion } from "../Accordion";

function renderAccordion(title: string, children: string) {
  const { container } = render(<Accordion title={title}>{children}</Accordion>);
  const root = container.querySelector(".accordion")!;
  return { root, view: within(root as HTMLElement) };
}

describe("Accordion", () => {
  it("renders title", () => {
    const { view } = renderAccordion("Test Section", "Content");
    expect(view.getByText("Test Section")).toBeInTheDocument();
  });

  it("hides content by default", () => {
    const { view } = renderAccordion("Title", "Hidden content");
    expect(view.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("shows content when clicked", async () => {
    const { view } = renderAccordion("Title", "Visible content");
    await userEvent.click(view.getByRole("button"));
    expect(view.getByText("Visible content")).toBeInTheDocument();
  });

  it("hides content when clicked again", async () => {
    const { view } = renderAccordion("Title", "Toggle content");
    const btn = view.getByRole("button");
    await userEvent.click(btn);
    expect(view.getByText("Toggle content")).toBeInTheDocument();
    await userEvent.click(btn);
    expect(view.queryByText("Toggle content")).not.toBeInTheDocument();
  });

  it("shows down arrow when open, right arrow when closed", async () => {
    const { root, view } = renderAccordion("Title", "Content");
    expect(root.querySelector(".accordion-arrow")!.textContent).toBe("\u25B6");
    await userEvent.click(view.getByRole("button"));
    expect(root.querySelector(".accordion-arrow")!.textContent).toBe("\u25BC");
  });

  it("applies open class when expanded", async () => {
    const { root, view } = renderAccordion("Title", "Content");
    expect(root).not.toHaveClass("open");
    await userEvent.click(view.getByRole("button"));
    expect(root).toHaveClass("open");
  });
});
