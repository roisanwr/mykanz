// components/shared/GSAPProvider.tsx
// Registers GSAP plugins once globally — must be a Client Component
'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function GSAPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register plugins client-side only
    gsap.registerPlugin(ScrollTrigger);

    // Global GSAP defaults — professional easing, no cheap bounce
    gsap.defaults({
      ease:     'power3.out',
      duration: 0.5,
    });

    return () => {
      // Cleanup all ScrollTrigger instances on unmount
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return <>{children}</>;
}
