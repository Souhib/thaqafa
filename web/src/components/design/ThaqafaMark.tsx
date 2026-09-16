// Thaqafa brand mark — eight-point khātam (rub al-hizb) framing the
// Arabic letter ث (Thā). Used as the favicon, the iOS / Android app
// icon, and the lockup in the website's top-left corner.
//
// All colour tokens come from CSS variables in ``src/index.css`` so the
// mark auto-adapts to dark mode without branching here.

interface Props {
  /** Pixel size of the square tile. The internal star + glyph scale with it. */
  size?: number;
  className?: string;
}

export function ThaqafaMark({ size = 40, className }: Props) {
  // Star geometry mirrors the design canvas (logos.jsx → AppIconMark
  // style="star-light" + glyph="arabic"). The two squares' vertices sit
  // at 92% of the half-extent; rotation is 0° for the diamond and 45°
  // for the axis-aligned square.
  const cx = 12;
  const half = 12 * 0.92;
  const sqPoints = (rotDeg: number): string => {
    const pts: string[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + (rotDeg * Math.PI) / 180;
      pts.push(`${(cx + half * Math.cos(a)).toFixed(2)},${(cx + half * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(" ");
  };
  // Stroke and font scale with the canvas so the mark stays legible
  // from a 16px favicon up to a 1024px app-icon.
  const stroke = Math.max(0.6, size / 80);
  const radius = size * 0.22;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        position: "relative",
        borderRadius: radius,
        overflow: "hidden",
        background: "var(--paper-hi)",
        border: "1px solid var(--rule)",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ position: "absolute", inset: 0 }}
      >
        <g
          fill="none"
          stroke="var(--ink)"
          strokeWidth={stroke * (24 / size)}
          strokeLinejoin="miter"
        >
          <polygon points={sqPoints(0)} />
          <polygon points={sqPoints(45)} />
        </g>
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          color: "var(--accent)",
          fontFamily: "Amiri, 'Scheherazade New', 'Noto Naskh Arabic', serif",
          fontWeight: 500,
          fontSize: size * 0.42,
          lineHeight: 1,
        }}
      >
        ث
      </span>
    </span>
  );
}

interface LockupProps {
  /** Tile size in pixels. Latin + Arabic scale proportionally. */
  size?: number;
  /** Hide the Arabic ثقافة accent. Defaults to false (kept on desktop). */
  hideArabic?: boolean;
  className?: string;
}

/**
 * Horizontal lockup: tile + italic "Thaqafa" + accent "ثقافة". Drop the
 * Arabic on small viewports via ``hideArabic`` so the masthead stays
 * compact on phones (matches the design canvas's mobile recommendation).
 */
export function ThaqafaLockup({ size = 40, hideArabic = false, className }: LockupProps) {
  const latinSize = size * 0.65;
  const arabicSize = size * 0.45;
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32 }}
    >
      <ThaqafaMark size={size} />
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          gap: size * 0.22,
          color: "var(--ink)",
        }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: latinSize,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Thaqafa
        </span>
        {!hideArabic && (
          <span
            dir="rtl"
            style={{
              fontFamily: "Amiri, 'Scheherazade New', 'Noto Naskh Arabic', serif",
              fontWeight: 500,
              fontSize: arabicSize,
              lineHeight: 1,
              color: "var(--accent)",
            }}
          >
            ثقافة
          </span>
        )}
      </span>
    </span>
  );
}
