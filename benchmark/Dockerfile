# Pin the resulting image by digest in benchmark/lock.json after building.
FROM node:24.21.0-bookworm-slim
RUN npm install --global typescript@7.0.2 --ignore-scripts && npm cache clean --force
USER 10001:10001
WORKDIR /scratch
CMD ["node", "--version"]
