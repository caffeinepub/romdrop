import { cn } from "@/lib/utils";

interface FileTypeBadgeProps {
  type: string;
  className?: string;
}

const FILE_TYPE_STYLES: Record<string, string> = {
  nds: "text-[oklch(0.82_0.18_185)] border-[oklch(0.82_0.18_185/0.5)] bg-[oklch(0.82_0.18_185/0.08)] shadow-[0_0_8px_oklch(0.82_0.18_185/0.2)]",
  ciso: "text-[oklch(0.80_0.20_145)] border-[oklch(0.80_0.20_145/0.5)] bg-[oklch(0.80_0.20_145/0.08)] shadow-[0_0_8px_oklch(0.80_0.20_145/0.2)]",
  wbfs: "text-[oklch(0.72_0.22_285)] border-[oklch(0.72_0.22_285/0.5)] bg-[oklch(0.72_0.22_285/0.08)] shadow-[0_0_8px_oklch(0.72_0.22_285/0.2)]",
};

const FILE_TYPE_DEFAULT = "text-muted-foreground border-border bg-muted";

export default function FileTypeBadge({ type, className }: FileTypeBadgeProps) {
  const key = type.toLowerCase().replace(".", "");
  const styles = FILE_TYPE_STYLES[key] ?? FILE_TYPE_DEFAULT;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold tracking-widest uppercase border rounded-xs",
        styles,
        className,
      )}
    >
      .{key}
    </span>
  );
}
