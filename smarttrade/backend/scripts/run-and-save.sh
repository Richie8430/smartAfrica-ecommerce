#!/usr/bin/env bash
# Run jest with the given pattern, save output to logs/
PATTERN="${1:-unit}"
OUTFILE="logs/${PATTERN}-test.log"
./node_modules/.bin/jest --testPathPattern="$PATTERN" --no-coverage --forceExit \
  > "$OUTFILE" 2>&1
CODE=$?
echo "EXIT_CODE:$CODE" >> "$OUTFILE"
exit $CODE
