// components/shared/GSAPProvider.tsx
// Registers GSAP plugins once globally — must be a Client Component
'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';

// Ensure registration happens outside React lifecycle to avoid timing issues with useGSAP
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, CustomEase);

  // Yui's signature ease: 'cubic-bezier(0.16,1,0.3,1)'
  // Ini menghilangkan animasi 'bounce' murahan dan menggantinya dengan
  // deselerasi lambat tapi mulus khas desain kelas atas ($50k+ studio look).
  CustomEase.create('yui', 'M0,0 C0.16,1 0.3,1 1,1');

  // Global GSAP defaults — professional easing
  gsap.defaults({
    ease:     'yui', // Set the custom premium ease as the default globally
    duration: 0.65,  // Slightly longer for that 'premium' feel
  });
}

export default function GSAPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return () => {
      // Cleanup all ScrollTrigger instances on unmount
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return <>{children}</>;
}
