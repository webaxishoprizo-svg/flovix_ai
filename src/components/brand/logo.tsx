export const FLOVIX_LOGO_URL = "/favicon.png";

export function FlovixLogo({
  size = 28,
  className = "",
  alt = "Flovix",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/favicon.png"
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
