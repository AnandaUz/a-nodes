export interface CoreMobileMode {
  navigation: boolean;
  adding: boolean;
  select: boolean;
}

export interface CoreMouseStatus {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}

export interface CoreModeState {
  textEditing: boolean;
  selectMoving: boolean;
  textNode: boolean;
  threads: boolean;
  threads_selected: boolean;
  selectedVNodeCount: number;
  deskId: string;
  wasMoving: boolean;
  scale: number;
  inputMode: {
    coarse: boolean;
    narrow: boolean;
  };
  isPinching: boolean;
  lastPinchEndTime: number;
  mobile_mode: CoreMobileMode;
  mouseStatus: CoreMouseStatus;
  isShiftDrag: boolean;
}

export type ModeChangeCallback = (key: string, value: unknown) => void;

export type ReactiveModeStore = CoreModeState & {
  setMode<K extends keyof CoreModeState>(key: K, value: CoreModeState[K]): void;
  getMode<K extends keyof CoreModeState>(key: K): CoreModeState[K];
  subscribe(callback: ModeChangeCallback): () => void;
};

export function createModeStore(
  initialState: CoreModeState,
  onNotify?: ModeChangeCallback,
): ReactiveModeStore {
  const listeners = new Set<ModeChangeCallback>();
  if (onNotify) {
    listeners.add(onNotify);
  }

  const notifyAll = (key: string, value: unknown) => {
    listeners.forEach((fn) => {
      try {
        fn(key, value);
      } catch (e) {
        console.error(`[ModeStore] error in subscriber for ${key}:`, e);
      }
    });
  };

  const storeMethods = {
    setMode<K extends keyof CoreModeState>(key: K, value: CoreModeState[K]): void {
      if ((initialState as any)[key] === value) return;
      (initialState as any)[key] = value;
      notifyAll(String(key), value);
    },
    getMode<K extends keyof CoreModeState>(key: K): CoreModeState[K] {
      return (initialState as any)[key];
    },
    subscribe(callback: ModeChangeCallback): () => void {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };

  const proxy = new Proxy(initialState, {
    get(target, prop, receiver) {
      if (prop in storeMethods) {
        return (storeMethods as any)[prop];
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const prev = Reflect.get(target, prop, receiver);
      if (prev === value) return true;
      const res = Reflect.set(target, prop, value, receiver);
      notifyAll(String(prop), value);
      return res;
    },
  }) as ReactiveModeStore;

  return proxy;
}
