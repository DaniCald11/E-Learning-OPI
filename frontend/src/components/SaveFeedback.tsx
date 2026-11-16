import { useEffect, useRef } from "react";
import { Alert } from "@mui/material";

export function SaveFeedback({
  message,
  severity = "success",
}: {
  message: string;
  severity?: "success" | "error";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [message]);
  return (
    <Alert
      ref={ref}
      tabIndex={-1}
      severity={severity}
      sx={{ scrollMarginTop: 24 }}
    >
      {message}
    </Alert>
  );
}
