FROM oven/bun:1.3.14

ARG TARGETARCH
ENV RUNNING_IN_DOCKER=true

USER root

COPY apps/server/build/out/kurier-linux-x64 /tmp/kurier-linux-x64
COPY apps/server/build/out/kurier-linux-arm64 /tmp/kurier-linux-arm64

RUN set -eux; \
    case "$TARGETARCH" in \
      amd64)  cp /tmp/kurier-linux-x64 /kurier ;; \
      arm64)  cp /tmp/kurier-linux-arm64 /kurier ;; \
      *) echo "Unsupported arch: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    chmod +x /kurier; \
    chown bun:bun /kurier; \
    rm -rf /tmp/kurier-linux-*

RUN mkdir -p /home/bun/.config/kurier && \
    chown -R bun:bun /home/bun/.config

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /home/bun

ENTRYPOINT ["/entrypoint.sh"]