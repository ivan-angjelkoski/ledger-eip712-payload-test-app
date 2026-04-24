<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { connect, hasMetaMask, getChainId, onChainChanged } from '../lib/metamask'
import { ethToInj } from '../lib/injective'

const emit = defineEmits<{
  (e: 'connected', v: { ethAddress: string; injAddress: string }): void
}>()

const ethAddress = ref<string | null>(null)
const connecting = ref(false)
const error = ref<string | null>(null)
const chainId = ref<number | null>(null)
let unsubscribe: (() => void) | null = null

const injAddress = computed(() =>
  ethAddress.value ? ethToInj(ethAddress.value) : null,
)

async function refreshChainId() {
  try {
    chainId.value = await getChainId()
  } catch {
    chainId.value = null
  }
}

async function handleConnect() {
  error.value = null
  connecting.value = true
  try {
    const addr = await connect()
    ethAddress.value = addr
    await refreshChainId()
    emit('connected', { ethAddress: addr, injAddress: ethToInj(addr) })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    connecting.value = false
  }
}

onMounted(() => {
  if (hasMetaMask()) {
    unsubscribe = onChainChanged((c) => {
      chainId.value = c
    })
  }
})
onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="wallet">
    <div class="heading">
      <span class="tag">wallet</span>
      <h3>granter</h3>
    </div>

    <button
      v-if="!ethAddress"
      class="connect"
      :disabled="connecting || !hasMetaMask()"
      @click="handleConnect"
    >
      <span class="dot" />
      {{ hasMetaMask() ? (connecting ? 'connecting…' : 'connect metamask') : 'metamask not detected' }}
    </button>

    <div v-else class="identity">
      <div class="row">
        <span class="lbl">eth</span>
        <code>{{ ethAddress }}</code>
      </div>
      <div class="row">
        <span class="lbl">inj</span>
        <code>{{ injAddress }}</code>
      </div>
      <div class="row">
        <span class="lbl">chain</span>
        <code v-if="chainId != null">{{ chainId }} · 0x{{ chainId.toString(16) }}</code>
        <code v-else class="muted">—</code>
      </div>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<style scoped>
.wallet {
  padding: 22px 20px 18px;
  border-bottom: 1px solid var(--hairline);
}
.heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
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
  color: var(--fg);
  line-height: 1;
}
.connect {
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--fg);
  padding: 10px 14px;
  border: 1px solid var(--hairline);
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.connect:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}
.connect:disabled {
  color: var(--muted);
  cursor: not-allowed;
}
.dot {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--accent);
}
.identity {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  gap: 10px;
  align-items: baseline;
}
.lbl {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  width: 24px;
  flex-shrink: 0;
}
code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg);
  word-break: break-all;
  line-height: 1.4;
}
code.muted { color: var(--muted); }
.err {
  margin: 12px 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--danger);
}
</style>
