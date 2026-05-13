// components/shared/PageTransition.tsx
// Smooth GSAP page transition — wraps main content, animates on route change
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Kill any running animations on this element
    gsap.killTweensOf(el);

    // Page entrance: fade up with expo-out easing
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      {
        opacity:   0,
        y:         18,
        filter:    'blur(4px)',
      },
      {
        opacity:   1,
        y:         0,
        filter:    'blur(0px)',
        duration:  0.55,
        ease:      'expo.out',
        clearProps: 'filter', // cleanup blur after animation
      }
    );

    return () => {
      tl.kill();
    };
  }, [pathname]);

  return (
    <div ref={containerRef} className={className} style={{ willChange: 'transform, opacity' }}>
      {children}
    </div>
  );
}
