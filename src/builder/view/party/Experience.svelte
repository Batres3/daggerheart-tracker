<script lang="ts">
    import { encounter } from "../../stores/encounter";
    import { RpgSystemSetting, getRpgSystem } from "src/utils";
    import { getContext } from "svelte";
    import Collapsible from "./Collapsible.svelte";

    const plugin = getContext("plugin");

    const open = plugin.data.builder.showXP;
    const rpgSystem = getRpgSystem(plugin);
    const party = plugin.defaultParty;

    $: enc = new Map(
        [...$encounter.entries()].map(([m, c]) =>
            m.friendly ? [m, 0] : [m, c]
        )
    );
    let filtered = 0;
    $: {
        filtered = 0;
        for (const [monster, count] of enc) {
            if (count === 0) {
                filtered += $encounter.get(monster) ?? 0;
            }
        }
    }

    $: difficulty = rpgSystem.getEncounterDifficulty(enc, party);
</script>

<div class="xp-container">
    <Collapsible
        {open}
        on:toggle={() =>
            (plugin.data.builder.showXP = !plugin.data.builder.showXP)}
    >
        <div class="title-container" slot="title">
            <h5 class="title">Balancing</h5>
            {#if filtered > 0}
                <span class="filtered"
                    >Filtering {filtered} allied creature{filtered > 1
                        ? "s"
                        : ""}</span
                >
            {/if}
        </div>
        <div class="content" slot="content">
            <div class="xp">
                <div class="encounter-difficulty">
                    <div class="difficulty container">
                        <strong class="header">Difficulty</strong>
                        <span>{difficulty.displayName}</span>
                    </div>
                    {#each difficulty.intermediateValues as intermediate}
                        <div class="adjusted container">
                            <strong class="header">{intermediate.label}</strong>
                            <span>{intermediate.value.toLocaleString()}</span>
                        </div>
                    {/each}
                    <div class="total container">
                        <strong class="header">{difficulty.title}</strong>
                        <span
                            >{rpgSystem.formatDifficultyValue(
                                difficulty.value
                            )}</span
                        >
                    </div>
                </div>
                <br />
            </div>
            <div class="budget">
                {#each rpgSystem.getAdditionalDifficultyBudgets(party) as budget}
                    <h5 class="experience-name">{budget.displayName}</h5>
                    <span class="experience-amount">
                        {rpgSystem.formatDifficultyValue(budget.minValue, true)}
                    </span>
                {/each}
            </div>
        </div>
    </Collapsible>
</div>

<style scoped>
    .title-container {
        display: flex;
        flex-flow: column nowrap;
        gap: 0.1rem;
    }
    .title {
        margin-bottom: 0;
    }
    .content {
        display: flex;
        flex-flow: column nowrap;
        gap: 0.25rem;
    }
    .filtered {
        font-size: smaller;
        color: var(--text-muted);
    }
    .xp-container {
        margin-left: auto;
    }
    .xp {
        display: flex;
        gap: 1rem;
    }
    .experience-amount {
        margin-left: auto;
    }
    .encounter-difficulty {
        display: flex;

        flex-flow: column nowrap;
        gap: 0.5rem;
        /* justify-content: space-between; */
        margin-bottom: 1rem;
    }
    .container {
        display: flex;
        flex-flow: column nowrap;
    }
    .header {
        text-transform: uppercase;
        font-weight: bolder;
    }
</style>
