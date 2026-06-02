// components/shared/MotionSection.tsx
// Single-element scroll-triggered fade+slide entrance.
// Wraps a server-rendered section — animates when it enters the viewport.
'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Initial Y offset. Default: 28 */
  y?: number;
  /** Duration. Default: 0.7 */
  duration?: number;
  /** Initial delay. Default: 0 */
  delay?: number;
  /** Threshold for intersection. Default: 0.05 */
  threshold?: number;
}

export default function MotionSection({
  children,
  className,
  style,
  y         = 28,
  duration  = 0.7,
  delay     = 0,
  threshold = 0.05,
}: MotionSectionProps) {
  const ref    = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, y, scale: 0.98 });

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !played.current) {
          played.current = true;
          gsap.to(el, {
            opacity:  1,
            y:        0,
            scale:    1,
            duration,
            ease:     'power3.out',
            delay,
            clearProps: 'transform',
          });
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [y, duration, delay, threshold]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
