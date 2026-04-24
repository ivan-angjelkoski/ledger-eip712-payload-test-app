<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NETWORK_CONFIG, EXPIRATION_SECONDS_DEFAULT, type NetworkKey } from '../lib/constants'

const props = defineProps<{
  connected: boolean
  buildingMessages: boolean
  buildingTypedData: boolean
  signing: boolean
  hasMessages: boolean
  hasTypedData: boolean
}>()

const emit = defineEmits<{
  (e: 'build-messages', v: FormState): void
  (e: 'build-typed-data', v: FormState): void
  (e: 'sign'): void
  (e: 'reset'): void
}>()

export interface FormState {
  grantee: string
  network: NetworkKey
  rfqAddress: string
  expirationSeconds: number
  accountNumber: string
  sequence: string
  timeoutHeight: string
  memo: string
  evmChainId: number
  chainId: string
}

const grantee = ref('')
const network = ref<NetworkKey>('testnet')
const rfqAddress = ref(NETWORK_CONFIG.testnet.rfqAddress)
const expirationSeconds = ref(EXPIRATION_SECONDS_DEFAULT)

const accountNumber = ref('')
const sequence = ref('')
const timeoutHeight = ref('0')
const memo = ref('')
const evmChainIdOverride = ref<string>('')
const chainIdOverride = ref<string>('')

const overridesOpen = ref(false)

watch(network, (k) => {
  rfqAddress.value = NETWORK_CONFIG[k].rfqAddress
  chainIdOverride.value = ''
  evmChainIdOverride.value = ''
})

const state = computed<FormState>(() => {
  const cfg = NETWORK_CONFIG[network.value]
  return {
    grantee: grantee.value.trim(),
    network: network.value,
    rfqAddress: rfqAddress.value.trim(),
    expirationSeconds: Number(expirationSeconds.value) || EXPIRATION_SECONDS_DEFAULT,
    accountNumber: accountNumber.value.trim(),
    sequence: sequence.value.trim(),
    timeoutHeight: timeoutHeight.value.trim() || '0',
    memo: memo.value,
    evmChainId: Number(evmChainIdOverride.value) || cfg.evmChainId,
    chainId: chainIdOverride.value.trim() || cfg.chainId,
  }
})

const granteeValid = computed(
  () => /^inj1[0-9a-z]{38,58}$/.test(grantee.value.trim()),
)
const canBuildMessages = computed(
  () => props.connected && granteeValid.value && !props.buildingMessages,
)
const canBuildTypedData = computed(
  () => props.hasMessages && !props.buildingTypedData,
)
const canSign = computed(
  () => props.hasTypedData && !props.signing,
)
</script>

<template>
  <div class="form">
    <div class="heading">
      <span class="tag">inputs</span>
      <h3>grant parameters</h3>
    </div>

    <label class="field">
      <span class="lbl">
        grantee inj address
        <em>— replaces privateKey.toBech32()</em>
      </span>
      <input
        v-model="grantee"
        type="text"
        placeholder="inj1…"
        spellcheck="false"
        autocomplete="off"
        :data-invalid="grantee.length > 0 && !granteeValid"
      />
    </label>

    <div class="grid-2">
      <label class="field">
        <span class="lbl">network</span>
        <select v-model="network">
          <option value="testnet">testnet</option>
          <option value="devnet">devnet</option>
          <option value="mainnet">mainnet</option>
        </select>
      </label>
      <label class="field">
        <span class="lbl">expiration (s)</span>
        <input v-model="expirationSeconds" type="number" min="60" step="60" />
      </label>
    </div>

    <label class="field">
      <span class="lbl">rfq contract address</span>
      <input
        v-model="rfqAddress"
        type="text"
        placeholder="inj1…"
        spellcheck="false"
        autocomplete="off"
      />
    </label>

    <button
      type="button"
      class="toggle"
      :aria-expanded="overridesOpen"
      @click="overridesOpen = !overridesOpen"
    >
      <span>{{ overridesOpen ? '−' : '+' }}</span>
      offline / manual overrides
    </button>

    <div v-if="overridesOpen" class="overrides">
      <div class="grid-2">
        <label class="field">
          <span class="lbl">account number</span>
          <input v-model="accountNumber" type="text" placeholder="fetch live" />
        </label>
        <label class="field">
          <span class="lbl">sequence</span>
          <input v-model="sequence" type="text" placeholder="fetch live" />
        </label>
      </div>
      <div class="grid-2">
        <label class="field">
          <span class="lbl">timeout height</span>
          <input v-model="timeoutHeight" type="text" />
        </label>
        <label class="field">
          <span class="lbl">memo</span>
          <input v-model="memo" type="text" />
        </label>
      </div>
      <div class="grid-2">
        <label class="field">
          <span class="lbl">chain id</span>
          <input v-model="chainIdOverride" type="text" :placeholder="NETWORK_CONFIG[network].chainId" />
        </label>
        <label class="field">
          <span class="lbl">evm chain id</span>
          <input v-model="evmChainIdOverride" type="text" :placeholder="String(NETWORK_CONFIG[network].evmChainId)" />
        </label>
      </div>
    </div>

    <div class="actions">
      <button
        class="btn"
        :disabled="!canBuildMessages"
        @click="emit('build-messages', state)"
      >
        {{ buildingMessages ? 'building…' : '01 · build messages' }}
      </button>
      <button
        class="btn"
        :disabled="!canBuildTypedData"
        @click="emit('build-typed-data', state)"
      >
        {{ buildingTypedData ? 'fetching account…' : '02 · build eip-712 typed data' }}
      </button>
      <button
        class="btn primary"
        :disabled="!canSign"
        @click="emit('sign')"
      >
        {{ signing ? 'awaiting signature…' : '03 · sign with metamask' }}
      </button>
      <button class="btn ghost" type="button" @click="emit('reset')">
        reset
      </button>
    </div>

    <p v-if="!connected" class="note">
      → connect metamask to derive the granter address.
    </p>
    <p v-else-if="grantee.length > 0 && !granteeValid" class="note err">
      → grantee must be a valid bech32 inj1 address.
    </p>
  </div>
</template>

<style scoped>
.form {
  padding: 22px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 2px;
}
.tag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--muted);
  text-transform: uppercase;
}
h3 {
  margin: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 20px;
  font-weight: 400;
  line-height: 1;
  color: var(--fg);
}

.field { display: flex; flex-direction: column; gap: 6px; }
.lbl {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-transform: uppercase;
}
.lbl em {
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
  color: var(--muted);
  opacity: 0.7;
  margin-left: 6px;
}

input, select {
  all: unset;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg);
  padding: 9px 11px;
  border: 1px solid var(--hairline);
  background: #0c0c0f;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
input:focus, select:focus {
  border-color: var(--accent);
}
input[data-invalid='true'] {
  border-color: var(--danger);
}
select {
  cursor: pointer;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%),
                    linear-gradient(-45deg, transparent 50%, var(--muted) 50%);
  background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 28px;
}

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.toggle {
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  margin-top: 4px;
  width: fit-content;
}
.toggle:hover { color: var(--fg); }
.toggle span {
  width: 14px;
  text-align: center;
  color: var(--fg);
  font-family: var(--font-mono);
}

.overrides {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 0 4px;
  border-top: 1px dashed var(--hairline);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.btn {
  all: unset;
  display: inline-flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg);
  padding: 11px 14px;
  border: 1px solid var(--hairline);
  background: transparent;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: border-color 0.15s, color 0.15s;
}
.btn:hover:not(:disabled) {
  border-color: var(--fg);
}
.btn:disabled {
  color: var(--muted);
  cursor: not-allowed;
  opacity: 0.6;
}
.btn.primary {
  color: var(--accent);
  border-color: var(--accent);
}
.btn.primary:hover:not(:disabled) {
  background: rgba(0, 245, 212, 0.07);
}
.btn.ghost {
  color: var(--muted);
  border-color: transparent;
  padding-left: 4px;
  justify-content: flex-start;
}
.btn.ghost:hover:not(:disabled) {
  color: var(--fg);
  border-color: transparent;
}

.note {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  margin: 4px 0 0;
}
.note.err {
  color: var(--danger);
}
</style>
