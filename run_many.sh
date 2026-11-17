#!/usr/bin/env bash
# Run several stories at the same time from ONE terminal. Each story gets its own folder output/<story-name>/ and its own log.
# usage: ./run_many.sh [run.sh options] story1.txt[:theme] story2.txt[:theme] ...
#   ./run_many.sh --theme cartoon --tts edge input/a.txt input/b.txt:dark input/c.txt:shorts
# (the part after ":" picks a theme for that story only). Runs without pauses (--yes). Lower CPU use per render, since they share the Mac.
set -uo pipefail
cd "$(dirname "$0")"
opts=(); stories=(); THEME=whiteboard
while [ $# -gt 0 ]; do
  case "$1" in
    --theme) THEME=$2; shift 2;;
    --tts|--voice|--from|--out) opts+=("$1" "$2"); shift 2;;
    --*) opts+=("$1"); shift;;
    *) stories+=("$1"); shift;;
  esac
done
[ ${#stories[@]} -gt 0 ] || { echo "usage: ./run_many.sh [options] story1.txt[:theme] story2.txt ..." >&2; exit 2; }

N=${#stories[@]}; CPU=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
export WBVE_CONCURRENCY=$(( CPU / 2 / N )); [ "$WBVE_CONCURRENCY" -ge 1 ] || WBVE_CONCURRENCY=1
echo "starting $N runs in parallel (render threads each: $WBVE_CONCURRENCY)"

pids=(); ids=()
for arg in "${stories[@]}"; do
  file=${arg%%:*}; theme=$THEME; [ "$arg" != "$file" ] && theme=${arg#*:}
  id=$(basename "$file"); id=${id%.*}; id=$(printf %s "$id" | tr -c 'A-Za-z0-9_.-' '_')
  mkdir -p "output/$id"
  ./run.sh "${opts[@]}" --yes --theme "$theme" --story "$file" > "output/$id/run.log" 2>&1 &
  pids+=($!); ids+=("$id")
  echo "  [$id] theme $theme  log: output/$id/run.log   (watch: tail -f output/$id/run.log)"
  sleep 3  # small stagger: the runs start with an AI call each
done

fail=0
for i in "${!pids[@]}"; do
  if wait "${pids[$i]}"; then s="OK    "; else s="FAILED"; fail=1; fi  # (FAILED is padded below)
  id=${ids[$i]}
  [ "$s" = "FAILED" ] && echo "       last log lines: $(tail -n 2 output/$id/run.log | tr '\n' ' ' | cut -c1-220)"
  echo "$s $id -> output/$id/  $( [ -f output/$id/final_video.mp4 ] && echo video )$( [ -f output/$id/youtube_package.txt ] && echo ' + youtube_package.txt' )$( [ -f output/$id/thumbnail.png ] && echo ' + thumbnail.png' )"
done
exit $fail
