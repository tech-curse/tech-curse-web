#!/usr/bin/env bash
set -euo pipefail

acao="${1:?use: imagens-base.sh espelhar|contextos}"
destino_base="${ESPELHO:-ghcr.io/tech-curse}"

mapfile -t imagens < <(sed -nE 's/^FROM[[:space:]]+([^[:space:]]+).*/\1/p' Dockerfile | sort -u)

espelho_de() {
  echo "$destino_base/espelho-${1##*/}"
}

existe() {
  docker buildx imagetools inspect "$1" >/dev/null 2>&1
}

case "$acao" in
  espelhar)
    for origem in "${imagens[@]}"; do
      destino=$(espelho_de "$origem")
      if existe "$destino"; then
        echo "Já espelhada: $destino"
        continue
      fi
      for tentativa in 1 2 3 4; do
        docker buildx imagetools create --tag "$destino" "$origem" && break
        [ "$tentativa" -eq 4 ] && exit 1
        sleep $((tentativa * 30))
      done
      echo "Espelhada: $origem -> $destino"
    done
    ;;
  contextos)
    for origem in "${imagens[@]}"; do
      destino=$(espelho_de "$origem")
      if existe "$destino"; then
        echo "$origem=docker-image://$destino"
      else
        echo "Sem espelho, usa a origem: $origem" >&2
      fi
    done
    ;;
  *)
    echo "Ação desconhecida: $acao" >&2
    exit 2
    ;;
esac
