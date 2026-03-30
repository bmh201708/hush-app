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

  return {
    persistBatch,
  };
}

module.exports = {
  createTelemetryStorage,
};
