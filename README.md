# use-history-state

A small, dependency-free React hook for state with full undo/redo history.
Think `useState`, but every committed value is remembered so you can step
backward and forward through it.

- ✅ Fully typed (TypeScript, generic over your value type)
- ✅ `undo` / `redo` with correct branching (a new `set` after `undo` discards
  the old redo stack, just like every text editor you've ever used)
- ✅ Optional history `capacity` and a customizable equality check
- ✅ Zero dependencies, ~1 kB, works with any value type (primitives,
  objects, arrays)
- ✅ 17 unit tests, no known bugs

## Quick start

```tsx
import { useHistoryState } from 'use-history-state';

function Counter() {
  const { value, previous, set, undo, redo, canUndo, canRedo } = useHistoryState(0);

  return (
    <div>
      <p>Count: {value} (was {previous ?? '—'})</p>
      <button onClick={() => set((n) => n + 1)}>+1</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

## API

### `useHistoryState(initialValue, options?)`

```ts
function useHistoryState<T>(
  initialValue: T | (() => T),
  options?: UseHistoryStateOptions<T>
): UseHistoryStateReturn<T>;
```

**Parameters**

| Parameter                | Type                             | Description                                                                                     |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `initialValue`           | `T \| (() => T)`                  | The starting value, or a lazy initializer (invoked once), exactly like `useState`.               |
| `options.capacity`       | `number` (optional)               | Maximum number of *past* entries to retain. Oldest entries are dropped once exceeded. Unbounded by default. Throws `RangeError` if set below `1`. |
| `options.isEqual`        | `(a: T, b: T) => boolean` (optional) | Called on every `set` to decide whether the value actually changed. When it returns `true`, no history entry is created and nothing re-renders. Defaults to `Object.is`. |

**Return value**

| Field      | Type                              | Description                                                                                   |
| ---------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `value`    | `T`                                  | The current value.                                                                              |
| `previous` | `T \| undefined`                    | The value immediately before `value`, or `undefined` if there is none yet.                      |
| `history`  | `T[]`                                | The full chronological trail of values, oldest first, ending with `value`. Undone values that haven't been redone are *not* included. |
| `set`      | `(update: T \| ((current: T) => T)) => void` | Commits a new value. Accepts a value or an updater function, mirroring `useState`. Pushes onto the undo stack and clears any redo stack. |
| `undo`     | `() => void`                         | Steps one entry back. No-op when `canUndo` is `false`.                                          |
| `redo`     | `() => void`                         | Steps one entry forward. No-op when `canRedo` is `false`.                                       |
| `canUndo`  | `boolean`                            | `true` when `undo()` would have an effect.                                                      |
| `canRedo`  | `boolean`                            | `true` when `redo()` would have an effect.                                                      |

## Behavior notes

**Branching.** History follows the same model as most editors: if you `undo`
a couple of steps and then call `set` with a new value, the old redo stack
(the steps you undid) is discarded. There's exactly one path forward from
any point in history.

```ts
set('a'); set('b'); set('c'); // history: [initial, a, b, c]
undo(); undo();                // value: a, redo available twice
set('z');                      // history: [initial, a, z] — 'b' and 'c' are gone
redo();                        // no-op: there is nothing to redo anymore
```

**Skipping no-op writes.** By default, calling `set` with a value considered
equal (`Object.is`) to the current one is ignored — no history entry, no
re-render. Pass a custom `isEqual` if your values need deep/structural
comparison (e.g. comparing an `id` field on an object) or pass
`isEqual={() => false}` to always record every `set` call, even
"no-op" ones.

**Capacity.** For long-running or high-frequency state (e.g. tracking mouse
drags or draw operations), pass `capacity` to cap memory usage. Once the
past stack exceeds `capacity`, the oldest entries are silently dropped —
`undo` simply becomes unavailable past that point.

**Granularity is up to you.** The hook doesn't decide how often you call
`set` — that's a modeling choice for your feature. Calling `set` on every
keystroke or every `mousemove` produces a very fine-grained history; most UIs
instead commit on meaningful boundaries (blur, mouseup, a debounce timer).
See `examples/TextEditorHistory.tsx` and `examples/ShapePositionEditor.tsx`
for both patterns.

## Examples

The [`examples/`](./examples) directory has three runnable components:

- **[`BasicCounter.tsx`](./examples/BasicCounter.tsx)** — the minimal case:
  a counter with undo/redo buttons.
- **[`TextEditorHistory.tsx`](./examples/TextEditorHistory.tsx)** — a
  `<textarea>` that debounces commits so undo steps through meaningful
  edits instead of individual keystrokes, plus a clickable draft timeline.
- **[`ShapePositionEditor.tsx`](./examples/ShapePositionEditor.tsx)** — a
  draggable point on an SVG canvas that commits one history entry per drag
  (not per `mousemove`) — the kind of pattern used for undoable vertex/feature
  edits in map or drawing tools.


## License

MIT