<script setup lang="ts">
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Profile Section -->
    <div class="rounded-xl bg-surface border border-border-default p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Perfil</h2>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent">U</div>
          <div>
            <div class="text-sm font-medium text-text-primary">Usuario</div>
            <div class="text-xs text-text-muted">usuario@email.com</div>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-text-secondary block mb-1.5">Nombre de usuario</label>
          <input type="text" value="Usuario" class="w-full h-10 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
        </div>
      </div>
    </div>

    <!-- Plan Section -->
    <div class="rounded-xl bg-surface border border-border-default p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Plan</h2>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-text-primary">Plan Basic — $10/mes</div>
          <div class="text-xs text-text-muted mt-0.5">Renovación: 15/12/2023</div>
        </div>
        <button class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors">Cambiar plan</button>
      </div>
    </div>

    <!-- Riot Client Path -->
    <div class="rounded-xl bg-surface border border-border-default p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Riot Client</h2>
      <div>
        <label class="text-xs font-medium text-text-secondary block mb-1.5">Ruta del Riot Client</label>
        <div class="flex gap-2">
          <input type="text" value="C:\Riot Games\Riot Client\RiotClientServices.exe" class="flex-1 h-10 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary font-mono focus:outline-none focus:border-accent transition-colors" />
          <button class="px-4 h-10 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors">Buscar</button>
        </div>
        <p class="text-[11px] text-text-muted mt-1.5">Se detecta automáticamente. Modifica solo si tienes problemas.</p>
      </div>
    </div>
  </div>
</template>
