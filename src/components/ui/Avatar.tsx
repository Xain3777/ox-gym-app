import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name:       string;
  photoUrl?:  string | null;
  size?:      "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "w-8 h-8 text-[13px]",
  md: "w-12 h-12 text-[18px]",
  lg: "w-16 h-16 text-[24px]",
};

export function Avatar({ name, photoUrl, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  const sizeClass = sizeStyles[size];

  if (photoUrl) {
    return (
      <div className={cn("relative flex-shrink-0 clip-corner-sm overflow-hidden", sizeClass, className)}>
        <Image
          src={photoUrl}
          alt={name}
          fill
          className="object-cover grayscale contrast-110"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-gold flex items-center justify-center",
        "font-display text-void no-select",
        "clip-corner-sm",
        sizeClass,
        className,
      )}
    >
      {initials}
    </div>
  );
}
