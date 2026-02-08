<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Clock, Coins, Loader2, Crown } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'
import { useRentalsStore } from '@renderer/stores/rentals.store'
import { useAccountsStore } from '@renderer/stores/accounts.store'
import { supabase } from '@renderer/lib/supabase'
import type { AccountPublic } from '@renderer/types/database'

const props = defineProps<{
  account: AccountPublic
}>()

const emit = defineEmits<{
  close: []
  rented: []
}>()

const auth = useAuthStore()
const rentalsStore = useRentalsStore()
const accountsStore = useAccountsStore()

const selectedDuration = ref<number | null>(null)
const isRenting = ref(false)
const errorMsg = ref('')

const durations = [
  { minutes: 30, credits: 25, label: '30m' },
  { minutes: 60, credits: 50, label: '1h' },
  { minutes: 120, credits: 90, label: '2h' },
  { minutes: 240, credits: 160, label: '4h' },
  { minutes: 480, credits: 280, label: '8h' },
  { minutes: 1440, credits: 500, label: '24h' }
]

const selectedOption = computed(() =>
  durations.find(d => d.minutes === selectedDuration.value) ?? null
)

const canAfford = computed(() => {
  if (auth.isUnlimited) return true
  if (!selectedOption.value) return false
  return auth.totalCredits >= selectedOption.value.credits
})

const balanceAfter = computed(() => {
  if (auth.isUnlimited) return auth.totalCredits
  if (!selectedOption.value) return auth.totalCredits
  return auth.totalCredits - selectedOption.value.credits
})

async function handleRent(): Promise<void> {
  if (!auth.user) return

  if (auth.isUnlimited) {
    await handleUnlimitedRent()
    return
  }

  if (!selectedOption.value || !canAfford.value) return

  isRenting.value = true
  errorMsg.value = ''

  try {
    const creditsToSpend = selectedOption.value.credits

    // Deduct credits (prefer purchased first, then subscription)
    const fromPurchased = Math.min(auth.profile!.purchased_credits, creditsToSpend)
    const fromSubscription = creditsToSpend - fromPurchased

    const { error: creditError } = await supabase
      .from('profiles')
      .update({
        purchased_credits: auth.profile!.purchased_credits - fromPurchased,
        subscription_credits: auth.profile!.subscription_credits - fromSubscription
      })
      .eq('id', auth.user.id)

    if (creditError) {
      errorMsg.value = 'Error al descontar créditos: ' + creditError.message
      return
    }

    // Create the rental
    const { error: rentalError } = await rentalsStore.startRental(
      auth.user.id,
      props.account.id,
      selectedOption.value.minutes,
      creditsToSpend
    )

    if (rentalError) {
      errorMsg.value = 'Error al crear alquiler: ' + rentalError
      return
    }

    // Log the credit transaction
    await supabase.from('credit_transactions').insert({
      user_id: auth.user.id,
      amount: -creditsToSpend,
      balance_type: fromPurchased > 0 ? 'purchased' : 'subscription',
      type: 'rental_spend',
      description: `Alquiler de ${props.account.name} por ${selectedOption.value.label}`
    })

    // Log the activity
    await supabase.from('activity_log').insert({
      user_id: auth.user.id,
      event_type: 'rental_start',
      metadata: {
        account_id: props.account.id,
        account_name: props.account.name,
        duration_minutes: selectedOption.value.minutes,
        credits_spent: creditsToSpend
      }
    })

    // Refresh profile to get updated credits
    await auth.fetchProfile()
    await accountsStore.fetchAccounts()

    emit('rented')
    emit('close')
  } finally {
    isRenting.value = false
  }
}

async function handleUnlimitedRent(): Promise<void> {
  if (!auth.user) return

  isRenting.value = true
  errorMsg.value = ''

  try {
    // Unlimited: 30-day rental, 0 credits
    const durationMinutes = 43200

    const { error: rentalError } = await rentalsStore.startRental(
      auth.user.id,
      props.account.id,
      durationMinutes,
      0
    )

    if (rentalError) {
      errorMsg.value = 'Error al crear alquiler: ' + rentalError
      return
    }

    await supabase.from('activity_log').insert({
      user_id: auth.user.id,
      event_type: 'rental_start',
      metadata: {
        account_id: props.account.id,
        account_name: props.account.name,
        duration_minutes: durationMinutes,
        credits_spent: 0,
        unlimited: true
      }
    })

    await accountsStore.fetchAccounts()

    emit('rented')
    emit('close')
  } finally {
    isRenting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>

    <!-- Modal -->
    <div class="relative w-full max-w-lg mx-4 rounded-2xl bg-surface border border-border-default shadow-2xl
                animate-in fade-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <h2 class="text-lg font-bold text-text-primary">Alquilar Cuenta</h2>
        <button
          class="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-5">
        <!-- Account Info -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center text-sm font-bold text-accent">
            {{ account.name[0] }}
          </div>
          <div>
            <div class="text-base font-bold text-text-primary">{{ account.name }}</div>
            <div class="flex items-center gap-2 text-xs text-text-secondary">
              <span>{{ account.elo }} {{ account.elo_division || '' }}</span>
              <span>•</span>
              <span>{{ account.lp }} LP</span>
              <span>•</span>
              <span>{{ account.server }}</span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" class="p-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error">
          {{ errorMsg }}
        </div>

        <!-- UNLIMITED USER: simplified flow -->
        <template v-if="auth.isUnlimited">
          <div class="rounded-xl bg-accent/5 border border-accent/20 p-4 text-center">
            <Crown class="w-6 h-6 text-accent mx-auto mb-2" />
            <div class="text-sm font-semibold text-text-primary">Plan Unlimited</div>
            <div class="text-xs text-text-secondary mt-1">
              Esta cuenta se asignará a ti sin límite de tiempo y sin costo de créditos.
              Libérala manualmente cuando ya no la necesites.
            </div>
          </div>

          <button
            :disabled="isRenting"
            class="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2
                   bg-accent hover:bg-accent-hover transition-all duration-150 active:scale-[0.98]
                   hover:shadow-[0_0_20px_-4px_rgba(108,92,231,0.5)]
                   disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleRent"
          >
            <Loader2 v-if="isRenting" class="w-4 h-4 animate-spin" />
            <Crown v-else class="w-4 h-4" />
            {{ isRenting ? 'Procesando...' : 'Alquilar cuenta' }}
          </button>
        </template>

        <!-- NORMAL USER: duration + credit flow -->
        <template v-else>
          <!-- Duration Selection -->
          <div>
            <div class="flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-3">
              <Clock class="w-4 h-4" />
              Selecciona duración del alquiler:
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="d in durations"
                :key="d.minutes"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all"
                :class="selectedDuration === d.minutes
                  ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                  : 'border-border-default hover:border-border-hover hover:bg-surface-hover'"
                @click="selectedDuration = d.minutes"
              >
                <span class="text-sm font-bold" :class="selectedDuration === d.minutes ? 'text-accent' : 'text-text-primary'">
                  {{ d.label }}
                </span>
                <span class="text-xs font-mono" :class="selectedDuration === d.minutes ? 'text-accent/70' : 'text-text-muted'">
                  {{ d.credits }} cr
                </span>
              </button>
            </div>
          </div>

          <!-- Balance Info -->
          <div v-if="selectedOption" class="rounded-xl bg-bg-primary border border-border-default p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Tu balance:</span>
              <span class="font-mono font-semibold text-text-primary">{{ auth.totalCredits }} créditos</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Costo:</span>
              <span class="font-mono font-semibold text-error">-{{ selectedOption.credits }} créditos</span>
            </div>
            <div class="h-px bg-border-default"></div>
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Después del alquiler:</span>
              <span class="font-mono font-bold" :class="balanceAfter >= 0 ? 'text-text-primary' : 'text-error'">
                {{ balanceAfter }} créditos
              </span>
            </div>
          </div>

          <!-- Not enough credits warning -->
          <div v-if="selectedOption && !canAfford" class="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
            No tienes suficientes créditos.
            <a class="underline cursor-pointer font-medium" @click="emit('close'); $router.push('/credits')">Comprar créditos</a>
          </div>

          <!-- Action Button -->
          <button
            :disabled="!selectedOption || !canAfford || isRenting"
            class="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2
                   transition-all duration-150 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed"
            :class="selectedOption && canAfford
              ? 'bg-accent hover:bg-accent-hover hover:shadow-[0_0_20px_-4px_rgba(108,92,231,0.5)]'
              : 'bg-accent/50'"
            @click="handleRent"
          >
            <Loader2 v-if="isRenting" class="w-4 h-4 animate-spin" />
            <Coins v-else class="w-4 h-4" />
            {{ isRenting ? 'Procesando...' : selectedOption ? `Alquilar por ${selectedOption.credits} créditos` : 'Selecciona una duración' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
