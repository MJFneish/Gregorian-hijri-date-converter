import { createContext, useContext } from 'react';
import type { View } from 'react-native';

export type ViewRef = React.ComponentRef<typeof View>;

interface HomeScrollContextValue {
  /** Scrolls the Home screen so `target` sits near the top of the viewport. */
  scrollToView: (target: ViewRef | null) => void;
}

export const HomeScrollContext = createContext<HomeScrollContextValue>({ scrollToView: () => {} });

export function useHomeScroll(): HomeScrollContextValue {
  return useContext(HomeScrollContext);
}
