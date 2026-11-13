# Supply the exact currently deployed image, including its sha256 digest.
ARG EVOLUTION_BASE_IMAGE
FROM ${EVOLUTION_BASE_IMAGE}
ARG EVOLUTION_BASE_IMAGE

COPY tools/evolution/patch-status-ack.cjs /tmp/patch-status-ack.cjs
COPY tools/evolution/test-status-ack.cjs /tmp/test-status-ack.cjs
RUN node -e 'if (!/@sha256:[a-f0-9]{64}$/.test(process.env.EVOLUTION_BASE_IMAGE || "")) process.exit(1)' \
    && node /tmp/test-status-ack.cjs node_modules/baileys/lib/Socket/messages-recv.js \
    && node /tmp/patch-status-ack.cjs \
    && node --check node_modules/baileys/lib/Socket/messages-recv.js \
    && rm /tmp/patch-status-ack.cjs /tmp/test-status-ack.cjs

LABEL org.m1m.evolution.status-ack="1"
