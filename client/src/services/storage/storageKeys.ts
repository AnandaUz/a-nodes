export const STORAGE_KEYS = {
  AUTH_TOKEN: "anodes:auth:token",
  AUTH_REFRESH_TOKEN: "anodes:auth:refreshToken",
  AUTH_USER: "anodes:auth:user",
  VIEWPORTS: "anodes:desk:viewports",
  HINT_SEEN: "anodes:meta:hint_seen",
} as const;

export const LEGACY_STORAGE_KEYS = {
  AUTH_TOKEN: "token",
  AUTH_REFRESH_TOKEN: "refreshToken",
  AUTH_USER: "user",
  HINT_SEEN: "desk_nav_hint_seen",
  VIEWPORT_PREFIX: "viewport-state",
  CACHE_PREFIX: "anodes_desk_cache_",
} as const;

