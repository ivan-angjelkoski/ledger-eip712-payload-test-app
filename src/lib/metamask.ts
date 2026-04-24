declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on?: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export function hasMetaMask(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum
}

export async function connect(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected. Install the extension and reload.')
  }
  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[]
  if (!accounts?.length) {
    throw new Error('No accounts returned from MetaMask')
  }
  return accounts[0]
}

export async function getChainId(): Promise<number> {
  if (!window.ethereum) throw new Error('MetaMask not detected')
  const hex = (await window.ethereum.request({ method: 'eth_chainId' })) as string
  return parseInt(hex, 16)
}

function toHexChainId(chainId: number): string {
  return '0x' + chainId.toString(16)
}

export async function switchChain(chainId: number): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not detected')
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHexChainId(chainId) }],
    })
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code
    // 4902 = chain not added to MetaMask. Let caller decide how to prompt.
    if (code === 4902) {
      throw new Error(
        `chain ${chainId} is not added to MetaMask. open metamask → networks → add network, then retry`,
      )
    }
    throw e
  }
}

export async function ensureChainId(chainId: number): Promise<void> {
  const current = await getChainId()
  if (current !== chainId) {
    await switchChain(chainId)
  }
}

export function onChainChanged(handler: (chainId: number) => void): () => void {
  if (!window.ethereum?.on) return () => {}
  const listener = (...args: unknown[]) => {
    const hex = args[0] as string
    handler(parseInt(hex, 16))
  }
  window.ethereum.on('chainChanged', listener)
  return () => {
    window.ethereum?.removeListener?.('chainChanged', listener)
  }
}

export async function signTypedDataV4(
  ethAddress: string,
  typedData: object,
): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected')
  }
  const signature = (await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [ethAddress, JSON.stringify(typedData)],
  })) as string
  return signature
}
