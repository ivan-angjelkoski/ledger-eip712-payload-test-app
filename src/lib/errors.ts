/** Shape of EIP-1193 / MetaMask RPC errors (plain objects, not Error instances). */
interface RpcError {
  code?: number
  message?: string
  data?: { message?: string } | unknown
}

/** Returns true when the user explicitly dismissed the MetaMask prompt. */
export function isUserRejection(e: unknown): boolean {
  const code = (e as RpcError)?.code
  const msg = ((e as RpcError)?.message ?? '').toLowerCase()
  return (
    code === 4001 ||
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('action_rejected')
  )
}

/** Known EIP-1193 error codes → friendly copy. Empty string = handle inline. */
const KNOWN_CODES: Record<number, string> = {
  4001: 'Request rejected in MetaMask.',
  4100: "MetaMask hasn't authorized this method. Reconnect and try again.",
  4200: "MetaMask doesn't support this method.",
  4900: "MetaMask isn't connected to a network.",
  4901: "MetaMask isn't connected to the requested network.",
  4902: "This network hasn't been added to MetaMask. Open MetaMask → Networks → Add network, then retry.",
  [-32002]: 'A MetaMask request is already pending. Open MetaMask to approve or reject it.',
  [-32603]: '', // handled below — prefer nested data.message
}

/**
 * Converts any thrown value into a readable string.
 * Handles EIP-1193 RPC error objects (plain `{code, message}`) that would
 * otherwise produce "[object Object]" via String().
 */
export function toFriendlyError(e: unknown): string {
  if (typeof e === 'string') return e || 'An unexpected error occurred.'

  if (e instanceof Error) {
    // Error subclasses (e.g. from ethers/viem) sometimes carry a numeric code.
    const rpc = e as Error & RpcError
    if (rpc.code != null && rpc.code in KNOWN_CODES) {
      const friendly = KNOWN_CODES[rpc.code]
      return friendly || rpc.message || e.message
    }
    return e.message
  }

  if (e != null && typeof e === 'object') {
    const rpc = e as RpcError

    if (rpc.code != null && rpc.code in KNOWN_CODES) {
      if (rpc.code === -32603) {
        // Internal error — prefer nested data.message for context
        const inner = (rpc.data as { message?: string } | undefined)?.message
        if (inner) return inner
        return rpc.message || 'MetaMask internal error.'
      }
      const friendly = KNOWN_CODES[rpc.code]
      return friendly || rpc.message || `MetaMask error (code ${rpc.code}).`
    }

    // Unknown code — prefer whichever message field is available
    if (rpc.message) return rpc.message
    const inner = (rpc.data as { message?: string } | undefined)?.message
    if (inner) return inner

    // Absolute last resort: JSON (never "[object Object]")
    try {
      return JSON.stringify(e)
    } catch {
      return 'An unexpected error occurred.'
    }
  }

  return 'An unexpected error occurred.'
}
