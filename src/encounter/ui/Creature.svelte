<script lang="ts">
    import { setIcon } from "obsidian";
    import type InitiativeTracker from "src/main";
    import { FRIENDLY, HIDDEN, RANDOM_HP, getRpgSystem } from "src/utils";
    import type { Creature } from "src/utils/creature";
    import { getContext } from "svelte";

    const plugin = getContext<InitiativeTracker>("plugin");
    const rpgSystem = getRpgSystem(plugin);

    export let creature: Creature;
    export let count: string | number;

    const rollEl = (node: HTMLElement) => {
        setIcon(node, RANDOM_HP);
    };
    const friendly = (node: HTMLElement) => {
        setIcon(node, FRIENDLY);
    };
    const hidden = (node: HTMLElement) => {
        setIcon(node, HIDDEN);
    };
</script>

<slot />
<div class="creature-container">
    {#if creature.friendly}
        <span class="has-icon" use:friendly />
    {/if}
    {#if creature.hidden}
        <span class="has-icon" use:hidden />
    {/if}
    <span class="creature-name" on:click={() => plugin.openCombatant(creature)}>
        {#if creature.display && creature.display != creature.name}
            {creature.display}{count == 1 ? "" : "s"} ({creature.name})
        {:else}
            {creature.name}{count == 1 ? "" : "s"}
        {/if}
    </span>
</div>

<style>
    .has-icon,
    .creature-container {
        display: inline-flex;
        align-items: center;
    }
    .creature-name {
        cursor: pointer;
    }
    .creature-name {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
    }
    .has-icon {
        display: flex;
        align-items: center;
    }
</style>
