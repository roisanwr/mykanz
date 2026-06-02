// components/shared/StaggerReveal.tsx
// Lightweight stagger animation for grid/list items.
// Uses IntersectionObserver + GSAP — reliable with SSR/Next.js App Router.
// Usage: wrap any server-rendered grid with <StaggerReveal className="grid ...">
'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay between each child (seconds). Default: 0.07 */
  stagger?: number;
  /** Direction of entry. Default: 'bottom' */
  from?: 'bottom' | 'top' | 'left' | 'right';
  /** Distance to travel (px). Default: 20 */
  distance?: number;
  /** Initial delay before first item (seconds). Default: 0 */
  delay?: number;
  /** Animate on first intersection only. Default: true */
  once?: boolean;
  style?: React.CSSProperties;
}

export default function StaggerReveal({
  children,
  className,
  stagger   = 0.07,
  from      = 'bottom',
  distance  = 20,
  delay     = 0,
  once      = true,
  style,
}: StaggerRevealProps) {
  const ref    = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = Array.from(container.children) as HTMLElement[];
    if (items.length === 0) return;

    // Set initial state
    const fromVars: gsap.TweenVars = {
      opacity: 0,
      y: from === 'bottom' ? distance : from === 'top' ? -distance : 0,
      x: from === 'left'   ? -distance : from === 'right' ? distance : 0,
      scale: 0.97,
    };
    gsap.set(items, fromVars);

    const animate = () => {
      if (once && played.current) return;
      played.current = true;
      gsap.to(items, {
        opacity:  1,
        y:        0,
        x:        0,
        scale:    1,
        duration: 0.65,
        ease:     'power3.out',
        stagger,
        delay,
        clearProps: 'transform',
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animate();
          if (once) observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [stagger, from, distance, delay, once]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
