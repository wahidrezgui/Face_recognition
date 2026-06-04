FROM alpine:3.19

RUN apk add --no-cache ffmpeg wget ca-certificates

ARG MEDIAMTX_VERSION=1.9.3
RUN wget -qO- \
    https://github.com/bluenviron/mediamtx/releases/download/v${MEDIAMTX_VERSION}/mediamtx_v${MEDIAMTX_VERSION}_linux_amd64.tar.gz \
    | tar -xzf - -C /usr/local/bin mediamtx

COPY mediamtx.yml /mediamtx.yml

EXPOSE 8554 8888

ENTRYPOINT ["/usr/local/bin/mediamtx", "/mediamtx.yml"]
