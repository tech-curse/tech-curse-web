#!/bin/sh
set -eu

case "${PAGAMENTOS_HABILITADOS:-}" in
  true | false) ;;
  *)
    echo "PAGAMENTOS_HABILITADOS deve ser true ou false; recebido: '${PAGAMENTOS_HABILITADOS:-}'" >&2
    exit 1
    ;;
esac

if ! printf '%s' "${API_URL:-}" | grep -Eq '^(/|https?://)[A-Za-z0-9._~:/-]*$'; then
  echo "API_URL deve ser um caminho (/tech-curse) ou um endereço http(s); recebido: '${API_URL:-}'" >&2
  exit 1
fi
