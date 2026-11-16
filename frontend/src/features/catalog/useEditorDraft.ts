import { useCallback, useRef, useState } from "react";
import type { SetStateAction } from "react";
import { useSession } from "../auth/session";
const prefix = "opi:editor:v1:";
const memory = new Map<string, unknown>();
function read<T extends { dirty: boolean }>(key: string, initial: T): T {
  try {
    const cached = (memory.get(key) ??
      JSON.parse(sessionStorage.getItem(key) ?? "null")) as
      | (T & { tab?: number; step?: number })
      | null;
    if (!cached || typeof cached !== "object") return initial;
    if (
      Object.entries(initial).some(
        ([field, value]) => value !== undefined && !(field in cached),
      )
    )
      return initial;
    if (cached.dirty === true) return cached;
    return {
      ...initial,
      ...(typeof cached.tab === "number" ? { tab: cached.tab } : {}),
      ...(typeof cached.step === "number" ? { step: cached.step } : {}),
    };
  } catch {
    return initial;
  }
}
export function clearEditorDrafts() {
  memory.clear();
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(prefix)) sessionStorage.removeItem(key);
  } catch {
    /* In-memory fallback still cleared. */
  }
}
export function useEditorDraft<T extends { dirty: boolean }>(
  editor: string,
  initial: T,
) {
  const { data: user } = useSession();
  const key = prefix + (user?.id ?? "anonymous") + ":" + editor;
  const [state, setState] = useState<T>(() => read(key, initial));
  const current = useRef(state);
  const [persistent, setPersistent] = useState(true);
  const update = useCallback(
    (action: SetStateAction<T>) => {
      const next =
        typeof action === "function"
          ? (action as (state: T) => T)(current.current)
          : action;
      current.current = next;
      memory.set(key, next);
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        setPersistent(false);
      }
      setState(next);
    },
    [key],
  );
  const clear = useCallback(() => {
    memory.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Private storage may be unavailable. */
    }
  }, [key]);
  return { state, setState: update, clear, persistent };
}
