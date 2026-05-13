// components/shared/PageTransition.tsx
// Smooth GSAP page transition — wraps main content, animates on route change
'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(() => {
    const el = containerRef.current;
    if (!el) return;

    // Kill any running animations on this element
    gsap.killTweensOf(el);

    // Premium Page Entrance: Subtle scale up with blur and clip path unmasking
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      {
        opacity:   0,
        y:         12,
        scale:     0.98,
        filter:    'blur(4px)',
        clipPath:  'inset(10% 0% 0% 0%)'
      },
      {
        opacity:   1,
        y:         0,
        scale:     1,
        filter:    'blur(0px)',
        clipPath:  'inset(0% 0% 0% 0%)',
        duration:  0.7,
        ease:      'yui', // Yui's global ease
        clearProps: 'filter,clipPath,transform', // cleanup after animation
      }
    );
  }, { dependencies: [pathname], scope: containerRef });

  return (
    <div ref={containerRef} className={className} style={{ willChange: 'transform, opacity, filter' }}>
      {children}
    </div>
  );
}
