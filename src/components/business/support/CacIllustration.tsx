'use client';

/**
 * CacIllustration — animated CAC-registration icon.
 *
 * Direct riff on the Moniepoint reference: a tilted cream document
 * with a Ruby+ (R+) tile, a wooden rubber stamp bobbing down every
 * couple seconds, and a green "CAC" seal that pulses when the stamp
 * hits. Pure SVG + SMIL (no external assets, no framer-motion), so
 * it renders identically in every browser and dark/light theme.
 *
 * The animation is looped and cheap — three concurrent SMIL timers,
 * all 2.4s. If we ever need to respect `prefers-reduced-motion`, wrap
 * the returned SVG in a media query check and drop the `<animate>`
 * children.
 */

interface Props {
  size?: number;
  className?: string;
}

export function CacIllustration({ size = 56, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Register with CAC"
    >
      {/* Document — tilted slightly like the reference */}
      <g transform="rotate(-8 32 38)">
        <rect
          x="10"
          y="16"
          width="34"
          height="44"
          rx="3"
          fill="#FCE9D4"
          stroke="#E4B285"
          strokeWidth="0.8"
        />
        {/* R+ tile — Ruby+ brand red instead of Moniepoint's blue */}
        <rect x="14" y="22" width="12" height="12" rx="2" fill="#FD362F" />
        <text
          x="20"
          y="31"
          fontSize="7"
          fontWeight="700"
          fill="#fff"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          R+
        </text>
        {/* Text lines */}
        <rect x="28" y="24" width="12" height="1.5" rx="0.75" fill="#D9BFA0" />
        <rect x="28" y="28" width="9" height="1.5" rx="0.75" fill="#D9BFA0" />
        <rect x="14" y="38" width="26" height="1.5" rx="0.75" fill="#D9BFA0" />
        <rect x="14" y="42" width="20" height="1.5" rx="0.75" fill="#D9BFA0" />
      </g>

      {/* CAC seal — throbs stronger right when the stamp hits (t=0.55) */}
      <g>
        <ellipse
          cx="40"
          cy="50"
          rx="11"
          ry="7"
          fill="none"
          stroke="#178E4B"
          strokeWidth="1.2"
          strokeDasharray="2 1.2"
        >
          <animate
            attributeName="stroke-width"
            values="1;1;1.8;1;1"
            keyTimes="0;0.5;0.6;0.8;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.55;0.55;1;0.85;0.55"
            keyTimes="0;0.5;0.6;0.8;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </ellipse>
        <text
          x="40"
          y="52"
          fontSize="5"
          fontWeight="800"
          fill="#178E4B"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          CAC
          <animate
            attributeName="opacity"
            values="0.6;0.6;1;0.9;0.6"
            keyTimes="0;0.5;0.6;0.8;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </text>
      </g>

      {/* Stamp — held above the doc, thumps down onto the seal, lifts back */}
      <g>
        {/* Wooden handle top */}
        <ellipse cx="42" cy="4" rx="3" ry="1.5" fill="#B07642" />
        {/* Handle shaft */}
        <rect x="39" y="4" width="6" height="10" rx="1.5" fill="#8B5A2B" />
        {/* Connector between handle + pad */}
        <rect x="38" y="14" width="8" height="2" fill="#5F3A1A" />
        {/* Ink pad — purple for Ruby+ accent */}
        <rect x="36" y="16" width="12" height="4" rx="1" fill="#8B5CF6" />
        <rect x="36" y="18" width="12" height="2.5" rx="1" fill="#6D28D9" />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; 0,0; 0,26; 0,0; 0,0"
          keyTimes="0; 0.4; 0.55; 0.7; 1"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}
