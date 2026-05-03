#!/bin/sh

resolve_app_root() {
  if [ -n "${APP_ROOT:-}" ]; then
    if [ -f "$APP_ROOT/package.json" ]; then
      printf '%s\n' "$APP_ROOT"
      return 0
    fi
    echo "FAIL: APP_ROOT is set but package.json was not found: $APP_ROOT" >&2
    return 1
  fi

  START_DIR=${1:-$(pwd)}
  CURRENT_DIR=$(cd "$START_DIR" 2>/dev/null && pwd)

  while [ -n "$CURRENT_DIR" ] && [ "$CURRENT_DIR" != "/" ]; do
    if [ -f "$CURRENT_DIR/package.json" ]; then
      if node -e 'const pkg=require(process.argv[1]); const scripts=pkg.scripts||{}; process.exit(scripts.build && scripts["fmt:check"] && scripts["fmt:write"] ? 0 : 1);' "$CURRENT_DIR/package.json" >/dev/null 2>&1; then
        printf '%s\n' "$CURRENT_DIR"
        return 0
      fi
    fi
    CURRENT_DIR=$(dirname "$CURRENT_DIR")
  done

  if [ -f "$(pwd)/package.json" ]; then
    printf '%s\n' "$(pwd)"
    return 0
  fi

  echo "FAIL: unable to resolve app root. Set APP_ROOT explicitly." >&2
  return 1
}
