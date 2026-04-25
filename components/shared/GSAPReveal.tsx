// components/shared/GSAPReveal.tsx
// Generic scroll-triggered reveal component — use to animate any content into view
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger > 0 ? Array.from(el.children) : [el];

    const fromVars: gsap.TweenVars = {
      opacity: 0,
      y:       from === 'bottom' ? distance : from === 'top'   ? -distance : 0,
      x:       from === 'left'   ? -distance : from === 'right' ? distance  : 0,
    };

    const toVars: gsap.TweenVars = {
      opacity:  1,
      y:        0,
      x:        0,
      duration: 0.6,
      ease:     'power3.out',
      delay,
      stagger:  stagger || 0,
      scrollTrigger: {
        trigger:      el,
        start:        'top 88%',
        once:         true,
      },
    };

    const tween = gsap.fromTo(targets, fromVars, toVars);

    return () => {
      tween.kill();
    };
  }, [delay, distance, from, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
