import type { CSSProperties } from "react";
import { useTheme } from "next-themes";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const tooltipStyle: CSSProperties = {
    backgroundColor: dark ? "#0f172a" : "#ffffff",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: "8px",
    color: dark ? "#f1f5f9" : "#0f172a",
  };

  return {
    dark,
    grid: dark ? "#334155" : "#e2e8f0",
    axis: dark ? "#94a3b8" : "#64748b",
    label: dark ? "#e2e8f0" : "#334155",
    tooltipStyle,
  };
}
