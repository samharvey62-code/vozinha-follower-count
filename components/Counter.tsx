"use client";

/** The hero number. Updated every animation frame, so kept dumb and fast. */
export default function Counter({ value }: { value: number }) {
  const text = value > 0 ? value.toLocaleString("en-US") : "—";
  return (
    <div className="counter" aria-hidden="true">
      {text}
    </div>
  );
}
