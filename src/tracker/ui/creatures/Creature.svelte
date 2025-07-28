<script lang="ts">
    import { DEFAULT_UNDEFINED, FRIENDLY, HIDDEN } from "src/utils";
    import type { Creature } from "src/utils/creature";
    import Initiative from "./Initiative.svelte";
    import CreatureControls from "./CreatureControls.svelte";
    import Status from "./Status.svelte";
    import { Platform, setIcon } from "obsidian";
    import { tracker } from "../../stores/tracker";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
    const { updateTarget } = tracker;

    export let creature: Creature;
    $: statuses = creature.status;

    const name = () => creature.getName();
    const statblockLink = () => creature.getStatblockLink();
    const hiddenIcon = (div: HTMLElement) => {
        setIcon(div, HIDDEN);
    };
    const friendlyIcon = (div: HTMLElement) => {
        setIcon(div, FRIENDLY);
    };

    let hoverTimeout: NodeJS.Timeout = null;
    const tryHover = (evt: MouseEvent) => {
        hoverTimeout = setTimeout(() => {
            if (creature["statblock-link"]) {
                let link = statblockLink();
                if (/\[.+\]\(.+\)/.test(link)) {
                    //md
                    [, link] = link.match(/\[.+?\]\((.+?)\)/);
                } else if (/\[\[.+\]\]/.test(link)) {
                    //wiki
                    [, link] = link.match(/\[\[(.+?)(?:\|.+?)?\]\]/);
                }

                app.workspace.trigger(
                    "link-hover",
                    {}, //hover popover, but don't need
                    evt.target, //targetEl
                    link, //linkText
                    "initiative-tracker " //source
                );
            }
        }, 1000);
    };

    const cancelHover = (evt: MouseEvent) => {
        clearTimeout(hoverTimeout);
    };
</script>

<td class="name-container">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="name-holder"
        on:click|stopPropagation={(evt) => {
            dispatch("open-combatant", creature);
        }}
        on:mouseenter={tryHover}
        on:mouseleave={cancelHover}
    >
        {#if creature.hidden}
            <div class="centered-icon" use:hiddenIcon></div>
        {/if}
        {#if creature.friendly}
            <div class="centered-icon" use:friendlyIcon></div>
        {/if}
            <span class="name">{name()}</span>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="statuses" on:click={(e) => e.stopPropagation()}>
        {#if statuses.size}
            {#each [...statuses] as status}
                <Status
                    {status}
                    on:remove={() => {
                        tracker.updateCreatures({
                            creature,
                            change: { remove_status: [status] }
                        });
                    }}
                ></Status>
            {/each}
        {/if}
    </div>
</td>

<td
    class="center dc-container creature-adder"
    class:mobile={Platform.isMobile}
    on:click|stopPropagation={(evt) => {
        const prev = $updateTarget;
        $updateTarget = "dc";
        if (prev == "hp" || prev == "stress") return;
        tracker.setUpdate(creature, evt);
    }}
>
    <div
        class:dirty-ac={creature.dc.current != creature.dc.max}
        aria-label={creature.dc.current != creature.dc.max ? `${creature.dc.current}` : ""}
    >
        {creature.dc.current}
    </div>
</td>
<td
    class="center hp-container creature-adder"
    class:mobile={Platform.isMobile}
    on:click|stopPropagation={(evt) => {
        const prev = $updateTarget;
        $updateTarget = "hp";
        if (prev == "dc" || prev == "stress") return;
        tracker.setUpdate(creature, evt);
    }}
>
    <div>
        <span>{creature.hp.current}/{creature.hp.max}</span>
    </div>
</td>

<td
    class="center stress-container creature-adder"
    class:mobile={Platform.isMobile}
    on:click|stopPropagation={(evt) => {
        const prev = $updateTarget;
        $updateTarget = "stress";
        if (prev == "hp" || prev == "dc") return;
        tracker.setUpdate(creature, evt);
    }}
>
    <div >
        <span>{creature.stress.current}/{creature.stress.max}</span>
    </div>
</td>

<td class="controls-container">
    <CreatureControls
        on:click={(e) => e.stopPropagation()}
        on:tag
        on:edit
        on:hp
        {creature}
    ></CreatureControls>
</td>

<style scoped>
    .name-holder {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: small;
    }
    .centered-icon {
        display: flex;
        align-items: center;
    }
    .name {
        display: block;
        text-align: left;
        background-color: inherit;
        border: 0;
        padding: 0;
        height: unset;
        word-break: keep-all;
    }
    .center {
        text-align: center;
    }
    .creature-adder {
        cursor: pointer;
    }

    .statuses {
        display: flex;
        flex-flow: row wrap;
        column-gap: 0.25rem;
    }

    .controls-container {
        border-top-right-radius: 0.25rem;
        border-bottom-right-radius: 0.25rem;
    }
    .dirty-ac {
        font-weight: var(--font-bold);
    }
    .mobile {
        font-size: smaller;
    }
</style>
