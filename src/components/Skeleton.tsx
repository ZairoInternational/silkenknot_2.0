import type { CSSProperties } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
};

const roundedClass = {
  none: "rounded-none",
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
} as const;

/** Shared pulse bar — matches shop / order-detail skeleton tones. */
export function Skeleton({ className = "", style, rounded = "md" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[#e6e0d6] ${roundedClass[rounded]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-3 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
          style={index === lines - 1 ? { width: "66%" } : undefined}
        />
      ))}
    </div>
  );
}
