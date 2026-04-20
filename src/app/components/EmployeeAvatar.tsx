import { useMemo } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { cn } from "./ui/utils";

type EmployeeAvatarProps = {
  email: string;
  name?: string;
  className?: string;
  fallbackClassName?: string;
  style?: React.CSSProperties;
};


export function EmployeeAvatar({
  email,
  name,
  className,
  fallbackClassName,
  style,
}: EmployeeAvatarProps) {
  const initials = useMemo(() => {
    const base = (name || email || "?").trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    if (base.includes("@")) {
      return base.slice(0, 2).toUpperCase();
    }
    return base.slice(0, 2).toUpperCase() || "?";
  }, [email, name]);


  return (
    <Avatar className={cn(className)} style={style}>
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-slate-600 to-blue-900 text-white text-sm font-semibold",
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
