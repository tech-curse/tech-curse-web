#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

imagem="${WEB_IMAGE:-tech-curse-web:dev}"
porta="${PORTA:-8081}"
endereco="http://127.0.0.1:$porta"
nome="tech-curse-web-verificacao-$$"

falhar() {
  echo "FALHOU: $*" >&2
  docker logs "$nome" >&2 2>&1 || true
  exit 1
}

limpar() {
  docker rm -f "$nome" >/dev/null 2>&1 || true
}
trap limpar EXIT

cabecalho() {
  curl -s -D - -o /dev/null "$endereco$1" | tr -d '\r' | grep -i "^$2:" | cut -d' ' -f2-
}

usuario=$(docker image inspect "$imagem" --format '{{.Config.User}}')
[ -n "$usuario" ] && [ "$usuario" != "root" ] && [ "$usuario" != "0" ] || falhar "a imagem roda como root"
echo "ok: a imagem roda como '$usuario'"

docker run -d --name "$nome" -p "127.0.0.1:$porta:8080" \
  -e API_URL=/tech-curse -e PAGAMENTOS_HABILITADOS=true "$imagem" >/dev/null
for _ in $(seq 1 30); do
  [ "$(docker inspect "$nome" --format '{{.State.Health.Status}}')" = "healthy" ] && break
  sleep 1
done
[ "$(docker inspect "$nome" --format '{{.State.Health.Status}}')" = "healthy" ] || falhar "o contêiner não ficou healthy"
echo "ok: healthcheck"

[ "$(curl -s "$endereco/config.json")" = '{"apiUrl":"/tech-curse","pagamentosHabilitados":true}' ] \
  || falhar "config.json gerado das variáveis"
[ "$(cabecalho /config.json Cache-Control)" = "no-store" ] || falhar "config.json sem Cache-Control no-store"
echo "ok: config.json gerado das variáveis, sem cache"

curl -s "$endereco/cursos/3" | grep -q '<app-root' || falhar "fallback da SPA em /cursos/3"
[ "$(cabecalho /cursos/3 Cache-Control)" = "no-cache" ] || falhar "index.html sem Cache-Control no-cache"
script=$(curl -s "$endereco/" | grep -oE 'main-[A-Za-z0-9]+\.js' | head -n 1)
[ -n "$script" ] || falhar "bundle principal não encontrado no index.html"
[ "$(cabecalho "/$script" Cache-Control)" = "public, max-age=31536000, immutable" ] || falhar "bundle sem cache imutável"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$endereco/inexistente.js")" = "404" ] || falhar "arquivo estático inexistente deveria dar 404"
echo "ok: fallback da SPA e cache por tipo de arquivo"

[ "$(cabecalho / X-Content-Type-Options)" = "nosniff" ] || falhar "X-Content-Type-Options"
[ "$(cabecalho / X-Frame-Options)" = "DENY" ] || falhar "X-Frame-Options"
[ -z "$(cabecalho / Server | grep -E '[0-9]')" ] || falhar "o Nginx expõe a versão"
echo "ok: cabeçalhos de segurança, sem versão do Nginx"

inicio=$(date +%s)
docker stop "$nome" >/dev/null
duracao=$(( $(date +%s) - inicio ))
[ "$(docker inspect "$nome" --format '{{.State.ExitCode}}')" = "0" ] || falhar "o Nginx não terminou com código 0"
echo "ok: encerramento limpo em ${duracao}s, código 0"
docker rm -f "$nome" >/dev/null

for invalida in "PAGAMENTOS_HABILITADOS=sim" "API_URL=javascript:alert(1)"; do
  if docker run --rm -e "$invalida" "$imagem" >/dev/null 2>&1; then
    falhar "o contêiner subiu com $invalida"
  fi
done
echo "ok: configuração inválida impede a subida"
