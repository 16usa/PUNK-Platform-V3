// PUNK V1.2: initialize Buffer before evaluating Solana-dependent modules.
// Static ESM imports execute BEFORE a module's body. A dynamic import here
// ensures all dependencies see Buffer before their module initialization.
import { Buffer } from 'buffer';

if (!globalThis.Buffer) globalThis.Buffer = Buffer;

function reportStartupFailure(error) {
  console.error('[PUNK] Solana launch module failed to initialize:', error);
  globalThis.__punkLaunchRuntime = 'error';
  globalThis.__punkLaunchError = String(error?.message || 'Unknown JavaScript error').slice(0, 160);
  const detail = String(error?.message || 'Unknown JavaScript error').slice(0, 160);
  const message = 'Launch interface could not initialize: ' + detail;
  const status = document.getElementById('punk-launch-status');
  if (status) {
    status.textContent = message;
    status.dataset.state = 'error';
  }
  const xStatus = document.getElementById('punk-launch-x-status');
  if (xStatus && xStatus.textContent?.includes('Checking')) {
    xStatus.textContent = 'Launch client failed to load. X login remains available from the header.';
  }
}

globalThis.__punkLaunchRuntime = 'loading';
import('./punk-launch-client.js').then(() => {
  globalThis.__punkLaunchRuntime = 'loaded';
}).catch(reportStartupFailure);
