// components/shared/GSAPReveal.tsx
// Generic scroll-triggered reveal component — use to animate any content into view
'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

interface GSAPRevealProps {
  children:    React.ReactNode;
  className?:  string;
  /** Delay before animation starts (seconds) */
  delay?:      number;
  /** Direction of entry */
  from?:       'bottom' | 'left' | 'right' | 'top';
  /** Distance to travel in px */
  distance?:   number;
  /** Whether to stagger children */
  stagger?:    number;
}

export default function GSAPReveal({
  children,
  className,
  delay    = 0,
  from     = 'bottom',
  distance = 24,
  stagger  = 0,
}: GSAPRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger > 0 ? Array.from(el.children) : [el];

    const fromVars: gsap.TweenVars = {
      opacity: 0,
      y:       from === 'bottom' ? distance : from === 'top'   ? -distance : 0,
      x:       from === 'left'   ? -distance : from === 'right' ? distance  : 0,
      clipPath: 'inset(10% 0% 10% 0%)', // Premium masking reveal
      scale: 0.98,
    };

    const toVars: gsap.TweenVars = {
      opacity:  1,
      y:        0,
      x:        0,
      clipPath: 'inset(0% 0% 0% 0%)',
      scale: 1,
      duration: 0.8, // Slightly longer
      ease:     'yui', // Yui's global ease
      delay,
      stagger:  stagger || 0,
      scrollTrigger: {
        trigger:      el,
        start:        'top 90%', // Trigger slightly earlier
        once:         true,
      },
    };

    gsap.fromTo(targets, fromVars, toVars);
  }, { dependencies: [delay, distance, from, stagger], scope: ref });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
