import {
  MsgGrant,
  ChainGrpcAuthApi,
  getInjectiveAddress,
  getGenericAuthorizationFromMessageType,
  getEip712TypedDataV2,
  type Msgs,
} from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import { MsgType, EvmChainId } from '@injectivelabs/ts-types'
import { EXPIRATION_SECONDS_DEFAULT } from './constants'

export function ethToInj(ethAddress: string): string {
  return getInjectiveAddress(ethAddress)
}

export interface BuildGrantArgs {
  granter: string
  grantee: string
  rfqContract: string
  msgsType: MsgType[]
  rfqMsgsType: MsgType[]
  expirationSeconds?: number
}

export function buildGrantMessages({
  granter,
  grantee,
  rfqContract,
  msgsType,
  rfqMsgsType,
  expirationSeconds = EXPIRATION_SECONDS_DEFAULT,
}: BuildGrantArgs): Msgs[] {
  const expiration = Math.floor(Date.now() / 1000) + expirationSeconds

  const generic = msgsType.map((messageType) =>
    MsgGrant.fromJSON({
      grantee,
      granter,
      expiration,
      authorization: getGenericAuthorizationFromMessageType(messageType),
    }),
  )

  const rfq = rfqContract
    ? rfqMsgsType.map((messageType) =>
        MsgGrant.fromJSON({
          grantee: rfqContract,
          granter,
          expiration,
          authorization: getGenericAuthorizationFromMessageType(messageType),
        }),
      )
    : []

  return [...generic, ...rfq]
}

export async function fetchAccountInfo(
  network: Network,
  injectiveAddress: string,
): Promise<{ accountNumber: number; sequence: number }> {
  const endpoints = getNetworkEndpoints(network)
  const authApi = new ChainGrpcAuthApi(endpoints.grpc)
  const account = await authApi.fetchAccount(injectiveAddress)
  const base = account.baseAccount
  return {
    accountNumber: Number(base.accountNumber),
    sequence: Number(base.sequence),
  }
}

export interface BuildTypedDataArgs {
  msgs: Msgs[]
  chainId: string
  evmChainId: number
  accountNumber: number | string
  sequence: number | string
  timeoutHeight?: number | string
  memo?: string
}

export function buildEip712TypedData({
  msgs,
  chainId,
  evmChainId,
  accountNumber,
  sequence,
  timeoutHeight = 0,
  memo = '',
}: BuildTypedDataArgs) {
  return getEip712TypedDataV2({
    msgs,
    tx: {
      accountNumber: accountNumber.toString(),
      sequence: sequence.toString(),
      chainId,
      timeoutHeight: timeoutHeight.toString(),
      memo,
    },
    evmChainId: evmChainId as EvmChainId,
  })
}

export function messagesToJson(msgs: Msgs[]): unknown[] {
  return msgs.map((m) => m.toEip712V2())
}
