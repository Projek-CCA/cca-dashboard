interface LogomarkProps {
  size?: number;
  /** brand = gold ring / near-black glyph (light backgrounds).
   *  onDark = gold ring / white glyph (dark backgrounds, e.g. the sidebar badge).
   *  mono = single currentColor (inherits text color). */
  variant?: 'brand' | 'onDark' | 'mono';
  className?: string;
}

export function Logomark({ size = 32, variant = 'brand', className }: LogomarkProps) {
  const ringColor = variant === 'mono' ? 'currentColor' : '#F6B500';
  const glyphColor = variant === 'mono' ? 'currentColor' : variant === 'onDark' ? '#ffffff' : '#171200';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M 81.1 71.8 A 38 38 0 1 1 81.1 28.2" stroke={ringColor} strokeWidth="14" strokeLinecap="butt" />
      <path d="M 62 32 L 30 50 L 62 68" stroke={glyphColor} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="66,42 66,58 80,50" fill={glyphColor} />
    </svg>
  );
}
