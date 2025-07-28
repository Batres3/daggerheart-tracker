<script lang="ts">
    import { ExtraButtonComponent, setIcon } from "obsidian";
    import {
        DC,
        DEFAULT_UNDEFINED,
        FRIENDLY,
        HIDDEN,
        HP,
        STRESS,
        RANDOM_HP
    } from "src/utils";
    import type { Creature } from "src/utils/creature";
    import type { Writable } from "svelte/store";

    export let adding: Writable<Array<[Creature, number]>>;
    export let editing: Writable<Creature>;

    const minusIcon = (node: HTMLElement, creature: Creature) => {
        new ExtraButtonComponent(node).setIcon("minus");
    };
    const minus = (evt: MouseEvent, index: number) => {
        if ($adding[index][1] - 1 < 1) {
            del(evt, index);
            return;
        }
        $adding[index][1] -= 1;
        $adding = $adding;
    };
    const plusIcon = (node: HTMLElement, creature: Creature) => {
        new ExtraButtonComponent(node).setIcon("plus");
    };
    const add = (evt: MouseEvent, index: number) => {
        $adding[index][1] += 1;
        $adding = $adding;
    };
    const delIcon = (node: HTMLElement, creature: Creature) => {
        new ExtraButtonComponent(node).setIcon("trash");
    };
    const del = (evt: MouseEvent, index: number) => {
        $adding.splice(index, 1);
        $adding = $adding;
    };
    const dc = (node: HTMLElement) => {
        setIcon(node, DC);
    };
    const heart = (node: HTMLElement) => {
        setIcon(node, HP);
    };
    const brain = (node: HTMLElement) => {
        setIcon(node, STRESS);
    };
    const hidden = (node: HTMLElement) => {
        setIcon(node, HIDDEN);
    };
    const friendly = (node: HTMLElement) => {
        setIcon(node, FRIENDLY);
    };
</script>

<h5 class="list-header">Creatures</h5>
<div class="initiative-tracker-list">
    {#if $adding.length}
        {#each $adding as [creature, number], index}
            <div class="creature" on:click={() => ($editing = creature)}>
                <div class="creature-metadata">
                    <div class="creature-name">{creature.getName()}</div>
                    <div class="creature-amount">
                        <button
                            type="button"
                            class="creature-minus"
                            use:minusIcon={creature}
                            on:click|stopPropagation={(evt) =>
                                minus(evt, index)}
                        ></button>
                        <div class="creature-number">{number}</div>
                        <button
                            type="button"
                            class="creature-minus"
                            use:plusIcon={creature}
                            on:click|stopPropagation={(evt) => add(evt, index)}
                        ></button>
                        <button
                            type="button"
                            class="creature-delete"
                            use:delIcon={creature}
                            on:click|stopPropagation={(evt) => del(evt, index)}
                        ></button>
                    </div>
                </div>
                <small class="creature-data">
                        <span>
                            {creature.dc.max ?? DEFAULT_UNDEFINED}
                            <span use:dc></span>
                        </span>
                        <span>
                            {creature.hp.max ?? DEFAULT_UNDEFINED}
                            <span use:heart></span>
                        <span>
                            {creature.stress.max ?? DEFAULT_UNDEFINED}
                            <span use:brain></span>
                        </span>
                        {#if creature.hidden}
                            <span use:hidden></span>
                        {/if}
                        {#if creature.friendly}
                            <span use:friendly></span>
                        {/if}
                    </span>
                </small>
            </div>
        {/each}
    {:else}
        <span>Add a creature.</span>
    {/if}
</div>

<style scoped>
    .initiative-tracker-list {
        display: flex;
        flex: 1 1 auto;
        flex-flow: column nowrap;
        /* gap: 0.5rem; */
        height: 0px;
        overflow: scroll;
    }

    .creature {
        border-radius: 0.5rem;
        padding: 0.5rem;
    }
    .creature:hover {
        background-color: var(--background-secondary);
    }

    .creature-metadata {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .creature-amount {
        margin-left: auto;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        align-items: center;
        text-align: center;
    }
    .creature-data {
        --icon-size: 10px;
        display: flex;
        align-items: center;
        gap: 0.375rem;
    }
    .list-header {
        margin-top: 0;
        margin-bottom: 0.5rem;
    }
</style>
