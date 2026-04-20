import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = !mounted ? "dark" : resolvedTheme === "dark" ? "dark" : "light";

  return <Toaster position="top-right" richColors closeButton theme={theme} />;
}
