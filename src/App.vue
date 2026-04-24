<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import type { Msgs } from '@injectivelabs/sdk-ts'
import WalletConnect from './components/WalletConnect.vue'
import GrantForm from './components/GrantForm.vue'
import type { FormState } from './components/GrantForm.vue'
import InspectorPanel from './components/InspectorPanel.vue'
import { signTypedDataV4, ensureChainId, getChainId } from './lib/metamask'
import {
  buildGrantMessages,
  buildEip712TypedData,
  fetchAccountInfo,
  messagesToJson,
  recoverSigner,
} from './lib/injective'
import { TRADING_MESSAGES, RFQ_TRADING_MESSAGES, NETWORK_CONFIG } from './lib/constants'

const granter = ref<{ eth: string; inj: string } | null>(null)

const messagesPayload = ref<unknown>(null)
const typedDataPayload = ref<unknown>(null)
const signaturePayload = ref<unknown>(null)

const messagesStatus = ref<'idle' | 'ready' | 'error'>('idle')
const typedDataStatus = ref<'idle' | 'ready' | 'error'>('idle')
const signStatus = ref<'idle' | 'ready' | 'pending' | 'signed' | 'verified' | 'invalid' | 'error'>('idle')

const messagesError = ref<string | null>(null)
const typedDataError = ref<string | null>(null)
const signError = ref<string | null>(null)

const buildingMessages = ref(false)
const buildingTypedData = ref(false)
const signing = ref(false)

// Hold the current msgs array between panel 01 and 02. shallowRef keeps sdk-ts'
// discriminated-union Msgs types intact (deep reactivity collapses them).
const builtMessages = shallowRef<Msgs[] | null>(null)
const builtTypedData = shallowRef<object | null>(null)

// Target evmChainId of the last-built typed data — used to auto-switch MetaMask before signing.
const typedDataEvmChainId = ref<number | null>(null)

function onConnected(p: { ethAddress: string; injAddress: string }) {
  granter.value = { eth: p.ethAddress, inj: p.injAddress }
}

async function onBuildMessages(state: FormState) {
  if (!granter.value) return
  messagesError.value = null
  buildingMessages.value = true
  try {
    const msgs = buildGrantMessages({
      granter: granter.value.inj,
      grantee: state.grantee,
      rfqContract: state.rfqAddress,
      msgsType: TRADING_MESSAGES,
      rfqMsgsType: RFQ_TRADING_MESSAGES,
      expirationSeconds: state.expirationSeconds,
    })
    builtMessages.value = msgs

    // Reset downstream panels
    typedDataPayload.value = null
    typedDataStatus.value = 'idle'
    builtTypedData.value = null
    signaturePayload.value = null
    signStatus.value = 'idle'

    messagesPayload.value = {
      count: msgs.length,
      granter: granter.value.inj,
      grantee: state.grantee,
      rfqContract: state.rfqAddress,
      expirationUnix:
        Math.floor(Date.now() / 1000) + state.expirationSeconds,
      msgs: messagesToJson(msgs),
    }
    messagesStatus.value = 'ready'
  } catch (e: unknown) {
    messagesError.value = e instanceof Error ? e.message : String(e)
    messagesStatus.value = 'error'
  } finally {
    buildingMessages.value = false
  }
}

async function onBuildTypedData(state: FormState) {
  if (!granter.value || !builtMessages.value) return
  typedDataError.value = null
  buildingTypedData.value = true
  try {
    let accountNumber: number | string = state.accountNumber
    let sequence: number | string = state.sequence

    if (!accountNumber || !sequence) {
      const cfg = NETWORK_CONFIG[state.network]
      const info = await fetchAccountInfo(cfg.network, granter.value.inj)
      accountNumber = accountNumber || info.accountNumber
      sequence = sequence || info.sequence
    }

    const typedData = buildEip712TypedData({
      msgs: builtMessages.value,
      chainId: state.chainId,
      evmChainId: state.evmChainId,
      accountNumber,
      sequence,
      timeoutHeight: state.timeoutHeight,
      memo: state.memo,
    })

    builtTypedData.value = typedData
    typedDataEvmChainId.value = state.evmChainId
    typedDataPayload.value = {
      resolvedAccountNumber: accountNumber,
      resolvedSequence: sequence,
      evmChainId: state.evmChainId,
      typedData,
    }
    typedDataStatus.value = 'ready'

    // Reset signature panel when re-building typed data
    signaturePayload.value = null
    signStatus.value = 'idle'
  } catch (e: unknown) {
    typedDataError.value = e instanceof Error ? e.message : String(e)
    typedDataStatus.value = 'error'
  } finally {
    buildingTypedData.value = false
  }
}

async function onSign() {
  if (!granter.value || !builtTypedData.value || typedDataEvmChainId.value == null) return
  signError.value = null
  signing.value = true
  signStatus.value = 'pending'
  try {
    // MetaMask rejects eth_signTypedData_v4 when domain.chainId != active chain.
    // Prompt a switch so the active chain matches what we built.
    const before = await getChainId()
    if (before !== typedDataEvmChainId.value) {
      await ensureChainId(typedDataEvmChainId.value)
    }
    const signature = await signTypedDataV4(
      granter.value.eth,
      builtTypedData.value,
    )

    // Locally verify: recover the signer from the signature and compare to the
    // connected MetaMask address. If they match, the signature is valid for this
    // typed data. No network calls needed.
    const recovery = await recoverSigner(
      builtTypedData.value as Parameters<typeof recoverSigner>[0],
      signature as `0x${string}`,
      granter.value.eth,
    )

    signaturePayload.value = {
      verification: {
        match: recovery.match,
        recovered: recovery.recovered,
        recoveredInj: recovery.recoveredInj,
        expected: recovery.expected,
      },
      signer: granter.value.eth,
      signerInj: granter.value.inj,
      signedOnEvmChainId: typedDataEvmChainId.value,
      switchedFromEvmChainId: before !== typedDataEvmChainId.value ? before : null,
      signature,
      signatureLengthBytes: (signature.length - 2) / 2,
    }
    signStatus.value = recovery.match ? 'verified' : 'invalid'
    if (!recovery.match) {
      signError.value = `signature recovered ${recovery.recovered} but expected ${recovery.expected}`
    }
  } catch (e: unknown) {
    signError.value = e instanceof Error ? e.message : String(e)
    signStatus.value = 'error'
  } finally {
    signing.value = false
  }
}

function onReset() {
  messagesPayload.value = null
  typedDataPayload.value = null
  signaturePayload.value = null
  builtMessages.value = null
  builtTypedData.value = null
  typedDataEvmChainId.value = null
  messagesStatus.value = 'idle'
  typedDataStatus.value = 'idle'
  signStatus.value = 'idle'
  messagesError.value = null
  typedDataError.value = null
  signError.value = null
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="mark" />
        <h1>
          <span class="pre">tc</span>
          <span class="main">auto-sign</span>
          <span class="post">·inspector</span>
        </h1>
        <span class="sub">
          reproduce the <code>connectAutoSign</code> eip-712 payload · signs only, never broadcasts
        </span>
      </div>
      <div class="meta">
        <span>v1</span>
        <span>·</span>
        <span>metamask · eip-712 v2</span>
      </div>
    </header>

    <div class="columns">
      <aside class="side">
        <WalletConnect @connected="onConnected" />
        <GrantForm
          :connected="!!granter"
          :building-messages="buildingMessages"
          :building-typed-data="buildingTypedData"
          :signing="signing"
          :has-messages="!!builtMessages"
          :has-typed-data="!!builtTypedData"
          @build-messages="onBuildMessages"
          @build-typed-data="onBuildTypedData"
          @sign="onSign"
          @reset="onReset"
        />
      </aside>

      <main class="console">
        <InspectorPanel
          index="01"
          title="messages"
          :status="messagesStatus"
          :payload="messagesPayload"
          :error-message="messagesError || undefined"
          empty-hint="→ paste a grantee inj address and click build messages"
        />
        <InspectorPanel
          index="02"
          title="eip-712 typed data"
          :status="typedDataStatus"
          :payload="typedDataPayload"
          :error-message="typedDataError || undefined"
          empty-hint="→ build messages first · fetches account num + sequence from chain"
        />
        <InspectorPanel
          index="03"
          title="signature"
          :status="signStatus"
          :payload="signaturePayload"
          :error-message="signError || undefined"
          empty-hint="→ build typed data · then approve in metamask"
        />
      </main>
    </div>

    <footer class="footnote">
      <span>mirrors </span>
      <code>injective-ui/app/store/wallet/index.ts :836–921</code>
      <span> · grantee replaces </span>
      <code>PrivateKey.generate()</code>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 28px 32px 22px;
  border-bottom: 1px solid var(--hairline);
  gap: 24px;
}
.brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.mark {
  display: none;
}
h1 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 44px;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--fg);
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
h1 .pre {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 400;
}
h1 .main {
  font-style: italic;
}
h1 .post {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 0;
}
.sub {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.02em;
}
.sub code {
  font-family: inherit;
  color: var(--fg);
}
.meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  display: inline-flex;
  gap: 8px;
  align-items: baseline;
  padding-top: 8px;
  flex-shrink: 0;
}

.columns {
  display: grid;
  grid-template-columns: 400px 1fr;
  flex: 1;
  min-height: 0;
}
.side {
  border-right: 1px solid var(--hairline);
  overflow: auto;
}
.console {
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.footnote {
  padding: 14px 32px;
  border-top: 1px solid var(--hairline);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--muted);
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}
.footnote code {
  font-family: inherit;
  color: var(--fg);
}

@media (max-width: 900px) {
  .columns { grid-template-columns: 1fr; }
  .side { border-right: none; border-bottom: 1px solid var(--hairline); }
  .topbar { padding: 20px; flex-direction: column; gap: 12px; }
  h1 { font-size: 32px; }
}
</style>
