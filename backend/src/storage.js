const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createTelemetryStorage({ telemetryDir, logger }) {
  fs.mkdirSync(telemetryDir, { recursive: true });

  async function persistBatch({ samples }) {
    const now = new Date();
    const dayDir = path.join(telemetryDir, now.toISOString().slice(0, 10));
    const batchId = `batch-${now.getTime()}-${crypto.randomUUID()}`;
    const fileName = `${batchId}.ndjson`;
    const absolutePath = path.join(dayDir, fileName);

    await fs.promises.mkdir(dayDir, { recursive: true });
    const ndjson = samples.map((sample) => JSON.stringify(sample)).join('\n');
    await fs.promises.writeFile(absolutePath, `${ndjson}${samples.length ? '\n' : ''}`, 'utf8');

    const relativePath = path.relative(telemetryDir, absolutePath);
    logger.info('Telemetry batch stored', { batchId, filePath: absolutePath, sampleCount: samples.length });

    return {
      batchId,
      absolutePath,
      relativePath,
      receivedAt: now.toISOString(),
    };
  }

  async function readRecentSamples({ relativePaths, limit, deviceId }) {
    const collected = [];

    for (const relativePath of relativePaths) {
      if (collected.length >= limit) {
        break;
      }

      const absolutePath = path.join(telemetryDir, relativePath);

      try {
        const content = await fs.promises.readFile(absolutePath, 'utf8');
        const samples = content
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .filter((sample) => !deviceId || sample.deviceId === deviceId);

        for (let index = samples.length - 1; index >= 0; index -= 1) {
          collected.push(samples[index]);
          if (collected.length >= limit) {
            break;
          }
        }
      } catch (error) {
        logger.warn('Unable to read telemetry batch from disk', {
          filePath: absolutePath,
          message: error instanceof Error ? error.message : 'Unknown file read error',
        });
      }
    }

    return collected.reverse();
  }

  return {
    persistBatch,
    readRecentSamples,
  };
}

module.exports = {
  createTelemetryStorage,
};
