import React, {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import Masonry from 'react-masonry-css';
import { MASONRY_BREAKPOINT_COLS } from './masonryBreakpoints';

const MasonryRelayoutContext = createContext(null);

export function useMasonryRelayout() {
  return useContext(MasonryRelayoutContext) ?? (() => {});
}

/**
 * Pinterest-подобная раскладка (react-masonry-css): карточки распределяются по колонкам,
 * перерасчёт после загрузки медиа через scheduleRelayout (событие resize, без remount).
 */
export default function MasonryGrid({
  children,
  className = 'masonry-feed',
  columnClassName = 'masonry-feed_column',
  breakpointCols = MASONRY_BREAKPOINT_COLS,
  loading = false,
  'aria-busy': ariaBusy,
}) {
  const timerRef = useRef(null);

  const scheduleRelayout = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const childCount = Children.count(children);

  useEffect(() => {
    scheduleRelayout();
  }, [childCount, scheduleRelayout]);

  const gridClass = [
    className,
    loading ? 'masonry-feed--loading' : '',
  ].filter(Boolean).join(' ');

  return (
    <MasonryRelayoutContext.Provider value={scheduleRelayout}>
      <div className="masonry-feed-outer">
        <Masonry
          breakpointCols={breakpointCols}
          className={gridClass}
          columnClassName={columnClassName}
          role="list"
          aria-busy={ariaBusy}
        >
          {children}
        </Masonry>
      </div>
    </MasonryRelayoutContext.Provider>
  );
}
