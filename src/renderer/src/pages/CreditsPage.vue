<script setup lang="ts">
import { Coins } from 'lucide-vue-next'
</script>

<template>
  <div class="space-y-6">
    <!-- Balance Card -->
    <div class="rounded-xl bg-surface border border-border-default p-8 text-center max-w-md mx-auto">
      <Coins class="w-8 h-8 text-warning mx-auto mb-2" />
      <div class="text-4xl font-bold font-mono text-text-primary">750</div>
      <div class="text-sm text-text-secondary mt-1">créditos disponibles</div>
      <div class="flex justify-center gap-4 mt-3 text-xs text-text-muted">
        <span>Suscripción: <span class="text-text-secondary">500</span></span>
        <span>|</span>
        <span>Comprados: <span class="text-text-secondary">250</span></span>
      </div>
      <div class="text-xs text-text-muted mt-2">Se recarga en: 23 días</div>
    </div>

    <!-- Credit Packages -->
    <div>
      <h2 class="text-base font-semibold text-text-primary mb-3">Comprar Créditos Extra</h2>
      <div class="grid grid-cols-3 gap-4 max-w-2xl">
        <div class="rounded-xl bg-surface border border-border-default p-5 hover:border-border-hover hover:bg-surface-hover transition-all cursor-pointer">
          <div class="text-sm font-semibold text-text-primary">Starter</div>
          <div class="text-2xl font-bold font-mono text-text-primary mt-2">500</div>
          <div class="text-xs text-text-muted">créditos</div>
          <div class="text-lg font-bold text-accent mt-3">$5</div>
          <button class="w-full mt-3 h-9 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors">Comprar</button>
        </div>

        <div class="rounded-xl bg-surface border border-accent-secondary/30 p-5 hover:border-accent-secondary/50 transition-all cursor-pointer relative">
          <span class="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-secondary text-bg-primary">Más vendido</span>
          <div class="text-sm font-semibold text-text-primary">Popular</div>
          <div class="text-2xl font-bold font-mono text-text-primary mt-2">1,200</div>
          <div class="text-xs text-text-muted">créditos</div>
          <div class="text-lg font-bold text-accent mt-3">$10</div>
          <button class="w-full mt-3 h-9 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors">Comprar</button>
        </div>

        <div class="rounded-xl bg-surface border border-border-default p-5 hover:border-border-hover hover:bg-surface-hover transition-all cursor-pointer">
          <div class="text-sm font-semibold text-text-primary">Pro</div>
          <div class="text-2xl font-bold font-mono text-text-primary mt-2">3,000</div>
          <div class="text-xs text-text-muted">créditos</div>
          <div class="text-lg font-bold text-accent mt-3">$22</div>
          <button class="w-full mt-3 h-9 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors">Comprar</button>
        </div>
      </div>
    </div>

    <!-- Transaction History -->
    <div>
      <h2 class="text-base font-semibold text-text-primary mb-3">Historial de Transacciones</h2>
      <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-default">
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Fecha</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Tipo</th>
              <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Monto</th>
              <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border-default/50 hover:bg-surface-hover transition-colors">
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">Hoy 14:32</td>
              <td class="px-4 py-3 text-sm text-text-primary">Alquiler</td>
              <td class="px-4 py-3 text-sm font-mono text-error text-right">-50</td>
              <td class="px-4 py-3 text-sm font-mono text-text-secondary text-right">750</td>
            </tr>
            <tr class="border-b border-border-default/50 hover:bg-surface-hover transition-colors">
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">Hoy 10:00</td>
              <td class="px-4 py-3 text-sm text-text-primary">Suscripción mensual</td>
              <td class="px-4 py-3 text-sm font-mono text-success text-right">+1000</td>
              <td class="px-4 py-3 text-sm font-mono text-text-secondary text-right">800</td>
            </tr>
            <tr class="hover:bg-surface-hover transition-colors">
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">Ayer</td>
              <td class="px-4 py-3 text-sm text-text-primary">Compra paquete</td>
              <td class="px-4 py-3 text-sm font-mono text-success text-right">+500</td>
              <td class="px-4 py-3 text-sm font-mono text-text-secondary text-right">300</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
