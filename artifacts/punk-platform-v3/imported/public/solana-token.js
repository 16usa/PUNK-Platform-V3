// PUNK Token Infrastructure V1
// Read-only Solana mint verification.
// No wallet connection or transactions.

const RPC_URL = 'https://api.mainnet-beta.solana.com';

const TOKEN_PROGRAMS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFduXWq5qHPwY8b6r'
]);

const ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(value) {
  if (typeof value !== 'string' ||
      !value ||
      /[^1-9A-HJ-NP-Za-km-z]/.test(value)) {
    throw new Error('Invalid Base58 address');
  }

  const bytes = [0];

  for (const char of value) {
    let carry = ALPHABET.indexOf(char);

    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }

  for (const char of value) {
    if (char !== '1') break;
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

export function isValidSolanaAddress(address) {
  try {
    return decodeBase58(address).length === 32;
  } catch {
    return false;
  }
}

export async function verifyMint(address) {
  if (!isValidSolanaAddress(address)) {
    return {
      valid: false,
      exists: false,
      isToken: false,
      error: 'Invalid Solana address'
    };
  }

  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          address,
          {
            encoding: 'base64',
            commitment: 'confirmed'
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('RPC HTTP ' + response.status);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || 'RPC error');
    }

    const account = result.result?.value;

    if (!account) {
      return {
        valid: true,
        exists: false,
        isToken: false,
        address
      };
    }

    const isTokenProgram = TOKEN_PROGRAMS.has(account.owner);

    return {
      valid: true,
      exists: true,
      isToken: isTokenProgram,
      address,
      owner: account.owner,
      executable: account.executable,
      dataLength: account.data?.[0]
        ? Math.floor(account.data[0].length * 3 / 4)
        : 0
    };

  } catch (error) {
    return {
      valid: true,
      exists: null,
      isToken: null,
      address,
      error: String(error.message || error)
    };
  }
}

// Diagnostic access only.
// Example: await window.PUNK_SOLANA.verifyMint('...')
window.PUNK_SOLANA = {
  isValidSolanaAddress,
  verifyMint
};
