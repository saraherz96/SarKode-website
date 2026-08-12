import type { Service } from '../types';

interface Props {
  icon: Service['icon'];
  size?: number;
  stroke?: string;
  style?: React.CSSProperties;
}

/** Renders the outline icon associated with a service, matching the original hand-drawn SVGs. */
export default function ServiceIcon({ icon, size = 24, stroke = '#F6F1EC', style }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.5,
    style,
  };

  switch (icon) {
    case 'agents':
      return (
        <svg {...common}>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
          <circle cx="19" cy="18" r="1.6" />
        </svg>
      );
    case 'automation':
      return (
        <svg {...common}>
          <circle cx="5" cy="6" r="2.2" />
          <circle cx="19" cy="6" r="2.2" />
          <circle cx="12" cy="18" r="2.2" />
          <path d="M6.8 7.3L11 16M17.2 7.3L13 16" />
        </svg>
      );
    case 'products':
      return (
        <svg {...common}>
          <rect x="4" y="8" width="16" height="12" rx="1" />
          <path d="M4 8l8-5 8 5" />
          <line x1="12" y1="8" x2="12" y2="20" />
        </svg>
      );
    case 'design':
      return (
        <svg {...common}>
          <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
          <circle cx="18" cy="6" r="1.3" />
        </svg>
      );
    default:
      return null;
  }
}
