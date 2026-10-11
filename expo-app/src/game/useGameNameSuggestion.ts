import { useCallback, useEffect, useRef, useState } from 'react';
import { gamesApi } from '@/api/endpoints';
import type { GameType } from '@/api/types';

/**
 * A random game name from the server, in the player's language. A blank
 * name is filled once on mount; roll() replaces the name on demand.
 */
export function useGameNameSuggestion(type: GameType, current: () => string, apply: (title: string) => void) {
  const [rolling, setRolling] = useState(false);
  const latest = useRef({ current, apply });
  useEffect(() => {
    latest.current = { current, apply };
  });

  // The first suggestion arrives quietly and never overwrites typing.
  useEffect(() => {
    if (latest.current.current().trim()) return;
    let cancelled = false;
    gamesApi
      .randomName(type)
      .then(({ title }) => {
        if (!cancelled && !latest.current.current().trim()) latest.current.apply(title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type]);

  const roll = useCallback(async () => {
    setRolling(true);
    try {
      latest.current.apply((await gamesApi.randomName(type)).title);
    } catch {
      // Keep whatever is there; typing a name still works.
    } finally {
      setRolling(false);
    }
  }, [type]);

  return { roll: () => void roll(), rolling };
}
