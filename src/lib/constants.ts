import { MsgType } from '@injectivelabs/ts-types'
import { Network } from '@injectivelabs/networks'

export const TRADING_MESSAGES: MsgType[] = [
  MsgType.MsgLiquidatePosition,
  MsgType.MsgBatchUpdateOrders,
  MsgType.MsgExecuteContractCompat,
  MsgType.MsgCancelDerivativeOrder,
  MsgType.MsgIncreasePositionMargin,
  MsgType.MsgCreateDerivativeLimitOrder,
  MsgType.MsgCreateDerivativeMarketOrder,
  MsgType.MsgBatchCancelDerivativeOrders,
  MsgType.MsgBatchCreateDerivativeLimitOrders,
]

export const RFQ_TRADING_MESSAGES: MsgType[] = [
  MsgType.MsgSend,
  MsgType.MsgBatchUpdateOrders,
  MsgType.MsgBatchUpdateOrdersV2,
  MsgType.MsgExecuteContractCompat,
  MsgType.MsgPrivilegedExecuteContractV2,
]

export type NetworkKey = 'testnet' | 'devnet' | 'mainnet'

export const NETWORK_CONFIG: Record<
  NetworkKey,
  { network: Network; rfqAddress: string; chainId: string; evmChainId: number }
> = {
  testnet: {
    network: Network.Testnet,
    rfqAddress: 'inj1qw7jk82hjvf79tnjykux6zacuh9gl0z0wl3ruk',
    chainId: 'injective-888',
    evmChainId: 11155111,
  },
  devnet: {
    network: Network.Devnet,
    rfqAddress: 'inj19g43wyj843ydkc845dcdea6su4mgfjwnpjz6h5',
    chainId: 'injective-777',
    evmChainId: 1776,
  },
  mainnet: {
    network: Network.Mainnet,
    rfqAddress: '',
    chainId: 'injective-1',
    evmChainId: 1,
  },
}

export const EXPIRATION_SECONDS_DEFAULT = 60 * 60 * 24 * 30

export const EIP712_TEST_ACCOUNT_ADDRESS = 'inj16qwwxvqsjcv233pw54z3rkq47g98wa5h2crpt7'
