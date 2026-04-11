// Inline SVG logo component — M3 Expressive style
interface TomBoardLogoProps {
  size?: number;
}

export default function TomBoardLogo({ size = 48 }: TomBoardLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="tb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#1A0536"/>
          <stop offset="100%" stopColor="#36096A"/>
        </linearGradient>
        <radialGradient id="tb-blob1" cx="30%" cy="30%" r="60%">
          <stop offset="0%"   stopColor="#FF4DB8" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#FF4DB8" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="tb-blob2" cx="75%" cy="72%" r="55%">
          <stop offset="0%"   stopColor="#00E5FF" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="tb-bar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#EAD9FF"/>
          <stop offset="100%" stopColor="#C77DFF"/>
        </linearGradient>
        <linearGradient id="tb-pink" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#FF80CE"/>
          <stop offset="100%" stopColor="#FF4DB8"/>
        </linearGradient>
        <linearGradient id="tb-teal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#80EEFF"/>
          <stop offset="100%" stopColor="#00C8E8"/>
        </linearGradient>
        <filter id="tb-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tb-halo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect width="512" height="512" rx="130" fill="url(#tb-bg)"/>
      <rect width="512" height="512" rx="130" fill="url(#tb-blob1)"/>
      <rect width="512" height="512" rx="130" fill="url(#tb-blob2)"/>
      <rect x="80" y="120" width="352" height="272" rx="68" fill="#FFFFFF" fillOpacity="0.045"/>

      {/* Bars */}
      <rect x="108" y="248" width="34" height="88"  rx="17" fill="url(#tb-teal)"  opacity="0.75"/>
      <rect x="158" y="206" width="34" height="130" rx="17" fill="url(#tb-bar)"   opacity="0.85"/>
      <rect x="208" y="168" width="34" height="168" rx="17" fill="url(#tb-bar)"/>
      <rect x="258" y="126" width="36" height="210" rx="18" fill="url(#tb-pink)"  filter="url(#tb-glow)"/>
      <rect x="312" y="168" width="34" height="168" rx="17" fill="url(#tb-bar)"/>
      <rect x="362" y="206" width="34" height="130" rx="17" fill="url(#tb-bar)"   opacity="0.85"/>
      <rect x="412" y="248" width="34" height="88"  rx="17" fill="url(#tb-teal)"  opacity="0.75"/>

      {/* Center glow halo */}
      <ellipse cx="276" cy="210" rx="38" ry="90" fill="#FF4DB8" opacity="0.18" filter="url(#tb-halo)"/>

      {/* TB badge */}
      <rect x="176" y="358" width="160" height="56" rx="28" fill="#C77DFF" fillOpacity="0.18"/>
      <rect x="176" y="358" width="160" height="56" rx="28" fill="none" stroke="#EAD9FF" strokeWidth="1.5" strokeOpacity="0.3"/>
      <text x="256" y="397"
        fontFamily="'SF Pro Rounded','Segoe UI',Arial,sans-serif"
        fontSize="28" fontWeight="800" textAnchor="middle" letterSpacing="3"
        fill="#EAD9FF">TB</text>
    </svg>
  );
}
