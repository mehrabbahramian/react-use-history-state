import { useCallback, useMemo, useRef, useState } from "react";

export interface UseHistoryStateOptions<T> {
  capacity?: number;
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseHistoryStateReturn<T> {
  value: T;
  previous: T | undefined;
  history: T[];
  set: (update: T | ((current: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface InternalState<T> {
  past: T[];
  present: T;
  future: T[];
}

function resolveInitial<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
}

export function useHistoryState<T>(
  initialValue: T | (() => T),
  options: UseHistoryStateOptions<T> = {},
): UseHistoryStateReturn<T> {
  const { capacity, isEqual = Object.is } = options;

  if (capacity !== undefined && capacity < 1) {
    throw new RangeError("useHistoryState: `capacity` must be >= 1 when provided.");
  }

  const [state, setState] = useState<InternalState<T>>(() => ({
    past: [],
    present: resolveInitial(initialValue),
    future: [],
  }));

  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;
  const capacityRef = useRef(capacity);
  capacityRef.current = capacity;

  const set = useCallback((update: T | ((current: T) => T)) => {
    setState((current) => {
      const nextPresent =
        typeof update === "function" ? (update as (current: T) => T)(current.present) : update;

      if (isEqualRef.current(nextPresent, current.present)) {
        return current;
      }

      let nextPast = [...current.past, current.present];
      const cap = capacityRef.current;
      if (cap !== undefined && nextPast.length > cap) {
        nextPast = nextPast.slice(nextPast.length - cap);
      }

      return {
        past: nextPast,
        present: nextPresent,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      if (current.past.length === 0) {
        return current;
      }
      const newPast = current.past.slice(0, -1);
      const steppedTo = current.past[current.past.length - 1] as T;
      return {
        past: newPast,
        present: steppedTo,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (current.future.length === 0) {
        return current;
      }
      const [steppedTo, ...restFuture] = current.future as [T, ...T[]];
      return {
        past: [...current.past, current.present],
        present: steppedTo,
        future: restFuture,
      };
    });
  }, []);

  const previous = state.past.length > 0 ? state.past[state.past.length - 1] : undefined;
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const history = useMemo(() => [...state.past, state.present], [state.past, state.present]);

  return {
    value: state.present,
    previous,
    history,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

export default useHistoryState;