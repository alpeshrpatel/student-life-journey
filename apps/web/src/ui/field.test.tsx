import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, fieldDescribedBy } from "./field.js";
import { Input } from "./input.js";

function renderField(props: { hint?: string; error?: string; required?: boolean }) {
  return render(
    <Field label="Moving to" htmlFor="city" {...props}>
      <Input
        id="city"
        aria-describedby={fieldDescribedBy("city", props)}
        required={props.required}
      />
    </Field>,
  );
}

describe("Field", () => {
  it("AC1: the control is found by its label text", () => {
    renderField({});
    expect(screen.getByLabelText("Moving to")).toBeInstanceOf(HTMLInputElement);
  });

  it("AC2: an error is announced and described by the input", () => {
    renderField({ error: "When do you arrive?" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("When do you arrive?");
    expect(screen.getByLabelText("Moving to").getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("AC3: with no hint and no error the input has no aria-describedby", () => {
    renderField({});
    expect(screen.getByLabelText("Moving to")).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("describes the input by the hint, and by hint then error when both exist", () => {
    renderField({ hint: "City and country", error: "Required" });
    expect(screen.getByLabelText("Moving to")).toHaveAttribute(
      "aria-describedby",
      "city-hint city-error",
    );
    expect(screen.getByText("City and country")).toHaveAttribute("id", "city-hint");
  });

  it("keeps the hint visible when there is an error", () => {
    renderField({ hint: "City and country", error: "Required" });
    expect(screen.getByText("City and country")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("marks a required field with a screen-reader word, not just a symbol", () => {
    renderField({ required: true });
    expect(screen.getByLabelText(/Moving to\s+required/)).toBeRequired();
  });
});

describe("fieldDescribedBy", () => {
  it("returns only the ids that exist", () => {
    expect(fieldDescribedBy("x", {})).toBeUndefined();
    expect(fieldDescribedBy("x", { hint: "h" })).toBe("x-hint");
    expect(fieldDescribedBy("x", { error: "e" })).toBe("x-error");
    expect(fieldDescribedBy("x", { hint: "h", error: "e" })).toBe("x-hint x-error");
    expect(fieldDescribedBy("x", { hint: "", error: "" })).toBeUndefined();
  });
});
