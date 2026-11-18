type BrandPinProps = {
  size?: number;
  className?: string;
};

/** Filled location pin; color via currentColor. */
export function BrandPin({ size = 18, className }: BrandPinProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      <path d="M12 2.25c-3.73 0-6.75 2.97-6.75 6.64 0 4.96 5.7 11.5 6.4 12.28a.5.5 0 0 0 .7 0c.7-.78 6.4-7.32 6.4-12.28 0-3.67-3.02-6.64-6.75-6.64Zm0 9.15a2.55 2.55 0 1 1 0-5.1 2.55 2.55 0 0 1 0 5.1Z" />
    </svg>
  );
}
