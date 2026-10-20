import { createContext, useContext } from 'react';
import type { Gesture } from 'react-native-gesture-handler';

type PanGesture = ReturnType<typeof Gesture.Pan>;

interface TabPagerContextValue {
  /** The pager's own drag gesture. A screen with its own horizontal gesture should call
   * `.blocksExternalGesture(pagerPanGesture)` on it so the two never both fire. */
  pagerPanGesture: PanGesture;
  /** Animates to the given tab by logical index (0 = home, 1 = settings). */
  goToTab: (index: number) => void;
  activeIndex: number;
}

export const TabPagerContext = createContext<TabPagerContextValue | null>(null);

export function useTabPager(): TabPagerContextValue {
  const ctx = useContext(TabPagerContext);
  if (!ctx) {
    throw new Error('useTabPager must be called from a screen rendered inside the tabs pager');
  }
  return ctx;
}
