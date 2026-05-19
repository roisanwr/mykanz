// components/shared/TextReveal.tsx
'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

interface TextRevealProps {
  text: string;
  className?: string;
  elementType?: any;
  delay?: number;
}

export default function TextReveal({
  text,
  className = '',
  elementType: Component = 'div',
  delay = 0,
}: TextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Split the text into characters
    const textSplit = new SplitType(containerRef.current, { types: 'chars,words' });

    // Ensure words have overflow hidden for the masking effect
    if (textSplit.words) {
      textSplit.words.forEach(word => {
        word.style.overflow = 'hidden';
      });
    }

    if (!textSplit.chars) return;

    gsap.fromTo(
      textSplit.chars,
      {
        yPercent: 100, // Move down 100% of its height
        opacity: 0,
      },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.02,
        ease: 'yui', // Premium ease
        delay: delay,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 90%',
          once: true,
        },
        onComplete: () => {
          // Cleanup inline styles after animation for responsiveness
          textSplit.revert();
        }
      }
    );
  }, { dependencies: [text, delay], scope: containerRef });

  return (
    <Component ref={containerRef} className={className}>
      {text}
    </Component>
  );
}
