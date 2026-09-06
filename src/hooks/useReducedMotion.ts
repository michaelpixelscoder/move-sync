import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Keeps interaction feedback calm when the platform asks for less motion. */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => subscription.remove();
  }, []);
  return reducedMotion;
}
