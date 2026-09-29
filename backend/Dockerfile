FROM rust:1.98.1-bookworm AS builder

WORKDIR /app

COPY Cargo.toml rust-toolchain.toml ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/space-call-backend /usr/local/bin/space-call-backend

ENV BIND_ADDR=0.0.0.0:8080

CMD ["/usr/local/bin/space-call-backend"]
