FROM public.ecr.aws/docker/library/node:24.21.0-alpine3.24 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx ng build --configuration production

FROM public.ecr.aws/nginx/nginx-unprivileged:1.30.4-alpine3.24

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/seguranca.conf /etc/nginx/snippets/seguranca.conf
COPY --chmod=755 nginx/05-validar-configuracao.sh /docker-entrypoint.d/05-validar-configuracao.sh
COPY --from=build /app/dist/tech-curse-web/browser /usr/share/nginx/html

USER 101
ENV API_URL=/tech-curse \
    PAGAMENTOS_HABILITADOS=false
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/saude"]
