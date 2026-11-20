import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "./input.js";

describe("Input", () => {
  it("is 44 px high with the control border", () => {
    render(<Input aria-label="City" />);
    expect(screen.getByLabelText("City")).toHaveClass("min-h-11", "border-control", "bg-surface");
  });

  it("invalid sets aria-invalid and the urgent edge", () => {
    render(<Input aria-label="City" invalid />);
    const input = screen.getByLabelText("City");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-urgent-edge");
    expect(input).not.toHaveClass("border-control");
  });

  it("is not invalid by default", () => {
    render(<Input aria-label="City" />);
    expect(screen.getByLabelText("City")).not.toHaveAttribute("aria-invalid");
  });

  it("AC4: a prefix is visible text and not part of the value", async () => {
    render(<Input aria-label="Budget" prefix="$" />);
    const input = screen.getByLabelText("Budget");
    await userEvent.type(input, "1200");
    expect(screen.getByText("$")).toBeInTheDocument();
    expect(input).toHaveValue("1200");
    expect(input).toHaveClass("ps-8");
  });

  it("forwards the ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="City" />);
    expect(ref.current).toBe(screen.getByLabelText("City"));
  });

  it("passes native props through and hides number spinners", () => {
    render(<Input aria-label="Amount" type="number" min={0} />);
    const input = screen.getByLabelText("Amount");
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("min", "0");
    expect(input.className).toContain("appearance-none");
  });
});
