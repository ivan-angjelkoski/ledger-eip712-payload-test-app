<script setup lang="ts">
import { computed, ref } from 'vue'

type Status = 'idle' | 'ready' | 'pending' | 'signed' | 'verified' | 'invalid' | 'error'

const props = defineProps<{
  index: string
  title: string
  status: Status
  payload: unknown
  errorMessage?: string
  noticeMessage?: string
  emptyHint?: string
}>()

const copied = ref(false)

const pretty = computed(() => {
  if (props.payload == null) return ''
  try {
    return JSON.stringify(props.payload, null, 2)
  } catch {
    return String(props.payload)
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'idle': return '[idle]'
    case 'ready': return '[ready]'
    case 'pending': return '[signing…]'
    case 'signed': return '[signed]'
    case 'verified': return '[verified ✓]'
    case 'invalid': return '[mismatch ✗]'
    case 'error': return '[error]'
  }
})

async function copy() {
  if (!pretty.value) return
  await navigator.clipboard.writeText(pretty.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<template>
  <section class="panel" :data-status="status">
    <header>
      <span class="index">{{ index }}</span>
      <span class="dot">·</span>
      <h2>{{ title }}</h2>
      <span class="status" :data-status="status">
        {{ statusLabel }}
        <i v-if="status === 'pending'" class="cursor" aria-hidden="true" />
      </span>
      <button
        v-if="pretty"
        class="copy"
        @click="copy"
        :aria-label="copied ? 'Copied' : 'Copy JSON'"
      >
        {{ copied ? 'copied' : 'copy' }}
      </button>
    </header>

    <div class="body">
      <pre v-if="pretty" :key="pretty"><code>{{ pretty }}</code></pre>
      <p v-else-if="status === 'error'" class="error">{{ errorMessage || 'error' }}</p>
      <p v-else-if="noticeMessage" class="notice">{{ noticeMessage }}</p>
      <p v-else class="hint">{{ emptyHint || '— awaiting input —' }}</p>
    </div>
  </section>
</template>

<style scoped>
.panel {
  border-top: 1px solid var(--hairline);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel:last-child {
  border-bottom: 1px solid var(--hairline);
}

header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--hairline);
}
.index {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.dot {
  color: var(--muted);
}
h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 22px;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--fg);
  margin: 0;
  flex: 1;
  font-style: italic;
}
.status {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status[data-status='signed'] { color: var(--accent); }
.status[data-status='verified'] { color: var(--accent); font-weight: 500; }
.status[data-status='invalid'] { color: var(--danger); font-weight: 500; }
.status[data-status='pending'] { color: var(--fg); }
.status[data-status='error'] { color: var(--danger); }
.status[data-status='ready'] { color: var(--fg); }

.cursor {
  display: inline-block;
  width: 7px;
  height: 12px;
  background: currentColor;
  animation: blink 0.9s steps(1) infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

.copy {
  all: unset;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 6px;
  border: 1px solid transparent;
  letter-spacing: 0.04em;
}
.copy:hover {
  color: var(--fg);
  border-color: var(--hairline);
}

.body {
  padding: 14px 18px 18px;
  overflow: auto;
  position: relative;
}
.panel[data-status='signed'] .body::after,
.panel[data-status='verified'] .body::after,
.panel[data-status='invalid'] .body::after,
.panel[data-status='ready'] .body::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: var(--accent);
  opacity: 0.3;
  animation: scanline 0.8s ease-out forwards;
  transform-origin: left;
  pointer-events: none;
}
@keyframes scanline {
  0%   { transform: scaleX(0); opacity: 0.5; }
  70%  { transform: scaleX(1); opacity: 0.4; }
  100% { transform: scaleX(1); opacity: 0;   }
}

pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.55;
  color: var(--fg);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 420px;
  overflow: auto;
}
pre code {
  font-family: inherit;
  color: inherit;
}

.hint {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  font-style: italic;
}
.notice {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  font-style: italic;
}
.error {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--danger);
  margin: 0;
  white-space: pre-wrap;
}
</style>
