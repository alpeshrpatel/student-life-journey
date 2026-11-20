import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button.js";

describe("Button", () => {
  it("defaults to type=button", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "button");
  });

  it("allows type=submit", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it.each([
    ["primary", "bg-accent"],
    ["secondary", "border-control"],
    ["ghost", "text-accent"],
  ] as const)("%s variant carries its token class", (variant, marker) => {
    render(<Button variant={variant}>Label</Button>);
    expect(screen.getByRole("button", { name: "Label" })).toHaveClass(marker);
  });

  it("icon variant needs an aria-label and is square-ish", () => {
    render(
      <Button variant="icon" aria-label="Close" iconStart={<svg data-testid="x" />}>
        {null}
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveClass("min-w-11");
    expect(screen.getByTestId("x").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("sizes are 44px and 48px high", () => {
    render(
      <>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Medium" })).toHaveClass("h-11");
    expect(screen.getByRole("button", { name: "Large" })).toHaveClass("h-12");
  });

  it("AC1: block is full width with a left-aligned label", () => {
    render(<Button block>Continue</Button>);
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("w-full", "justify-start", "text-start");
  });

  it("AC2: loading disables the button and shows loadingLabel", () => {
    render(
      <Button loading loadingLabel="Saving">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("AC3: a disabled button does not call onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Nope" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("a loading button does not call onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingLabel="Wait" onClick={onClick}>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Wait" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Ref" }));
  });

  it("marks start and end icons aria-hidden", () => {
    render(
      <Button iconStart={<i data-testid="s" />} iconEnd={<i data-testid="e" />}>
        Next
      </Button>,
    );
    expect(screen.getByTestId("s").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("e").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });
});
