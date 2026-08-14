#!/bin/sh
# Source gitignored repo-root .env into the current shell.
# Must be sourced so exports reach Gradle / Cursor agent shells:
#   . scripts/load-env.sh
#   . scripts/load-env.sh --check
#
# Cursor agent shells are non-interactive zsh -c (they skip ~/.zshrc).
# ~/.zshenv sources this file when cwd is this repo.

_rag_load_env_sourced=0
if [ -n "${ZSH_VERSION:-}" ]; then
  case "${ZSH_EVAL_CONTEXT:-}" in
    *:file*) _rag_load_env_sourced=1 ;;
  esac
  _RAG_FILE="${(%):-%x}"
elif [ -n "${BASH_VERSION:-}" ]; then
  _RAG_FILE="${BASH_SOURCE[0]}"
  if [ "$_RAG_FILE" != "$0" ]; then
    _rag_load_env_sourced=1
  fi
else
  _RAG_FILE="$0"
fi

_RAG_ROOT=$(CDPATH= cd -- "$(dirname -- "$_RAG_FILE")/.." && pwd) || {
  unset _RAG_FILE _RAG_ROOT _rag_load_env_sourced
  return 1 2>/dev/null || exit 1
}
_RAG_ENV="$_RAG_ROOT/.env"
_RAG_CHECK=0
[ "${1:-}" = "--check" ] && _RAG_CHECK=1

if [ "$_rag_load_env_sourced" -eq 0 ]; then
  if [ "$_RAG_CHECK" -eq 1 ] && [ -f "$_RAG_ENV" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$_RAG_ENV"
    set +a
    if [ -n "${NVD_API_KEY:-}" ]; then
      echo "NVD_API_KEY is set"
    else
      echo "NVD_API_KEY is missing"
      exit 1
    fi
    exit 0
  fi
  echo "source this script so exports reach the current shell:" >&2
  echo "  . \"$_RAG_ROOT/scripts/load-env.sh\"" >&2
  exit 1
fi

if [ -f "$_RAG_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$_RAG_ENV"
  set +a
fi

if [ "$_RAG_CHECK" -eq 1 ]; then
  if [ -n "${NVD_API_KEY:-}" ]; then
    echo "NVD_API_KEY is set"
  else
    echo "NVD_API_KEY is missing"
  fi
fi

unset _RAG_FILE _RAG_ROOT _RAG_ENV _RAG_CHECK _rag_load_env_sourced
