/** Hash do PIN com sal aleatório (SHA-256 via WebCrypto). Formato: "sal$hash" em hexadecimal. */

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

async function sha256(texto: string): Promise<string> {
  const data = new TextEncoder().encode(texto)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

export async function hashPin(pin: string, sal?: string): Promise<string> {
  const s = sal ?? toHex(crypto.getRandomValues(new Uint8Array(16)))
  return `${s}$${await sha256(`${s}:${pin}`)}`
}

export async function conferirPin(pin: string, armazenado: string): Promise<boolean> {
  const [sal] = armazenado.split('$')
  if (!sal) return false
  return (await hashPin(pin, sal)) === armazenado
}
