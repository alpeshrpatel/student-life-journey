import { render, screen } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { describe, expect, it } from "vitest";
import { routes } from "./router.js";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe("router", () => {
  it("renders the home placeholder at /", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Student Life Journey" })).toBeInTheDocument();
  });

  it("AC3: renders the not-found placeholder for an unknown path", () => {
    renderAt("/no/such/screen");
    expect(screen.getByRole("heading", { name: "We can't find that page." })).toBeInTheDocument();
  });
});
