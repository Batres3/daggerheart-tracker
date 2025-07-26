<script lang="ts">
    import { ExtraButtonComponent, setIcon } from "obsidian";
    import { getRpgSystem, DICE, RANDOM_HP, START_ENCOUNTER } from "src/utils";

    import { Creature } from "src/utils/creature";
    import type InitiativeTracker from "src/main";
    import type { Party } from "src/settings/settings.types.ts"
    import { tracker } from "src/tracker/stores/tracker";
    import type { CreatureState } from "src/types/creatures";
    import CreatureComponent from "./Creature.svelte";
    import { setContext } from "svelte";
    import type { StackRoller } from "@javalent/dice-roller";

    export let plugin: InitiativeTracker;

    setContext("plugin", plugin);

    export let name: string = "Encounter";
    export let creatures: Map<Creature, number | string> = new Map();
    export let party: Party = undefined;

    export let hide: string[] = [];

    let creatureMap: Map<Creature, number> = new Map();
    const rollerMap: Map<Creature, StackRoller> = new Map();
    const rpgSystem = getRpgSystem(plugin);

    for (let [creature, count] of creatures) {
        let number: number = Number(count);

        if (plugin.canUseDiceRoller) {
            let roller = plugin.getRoller(`${count}`);
            if (!roller) {
                creatureMap.set(creature, number);
            } else {
                roller.on("new-result", () => {
                    creatureMap.set(creature, roller.result);
                    creatureMap = creatureMap;
                });
                rollerMap.set(creature, roller);
                roller.rollSync();
            }
        } else {
            creatureMap.set(creature, number);
        }
    }

    $: difficulty = rpgSystem.getEncounterDifficulty(creatureMap, party);

    const openButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon(START_ENCOUNTER);
    };

    const open = async () => {
        if (!plugin.view) {
            await plugin.addTrackerView();
        }

        const view = plugin.view;
        const creatures: Creature[] = [...creatureMap]
            .map(([creature, number]) => {
                if (isNaN(Number(number)) || number < 1) return [creature];
                return [...Array(number).keys()].map((v) =>
                    Creature.new(creature)
                );
            })
            .flat();
        const transformedCreatures: CreatureState[] = [];
        for (const creature of [...creatures]) {
            transformedCreatures.push(creature.toJSON());
        }

        tracker.new(plugin, {
            creatures: transformedCreatures,
            name,
            party: party ? party.name : undefined,
            round: 1,
            state: false,
            logFile: null,
            roll: true,
            newLog: true
        });
        plugin.app.workspace.revealLeaf(view.leaf);
    };

    const addButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node).setIcon("plus-with-circle");
    };

    const add = async (evt: MouseEvent) => {
        if (!plugin.view) {
            await plugin.addTrackerView();
        }
        const creatures: Creature[] = [...creatureMap]
            .map(([creature, number]) => {
                if (isNaN(Number(number)) || number < 1) return [creature];
                return [...Array(number).keys()].map((v) =>
                    Creature.new(creature)
                );
            })
            .flat();
        tracker.add(plugin, ...creatures);
    };

    const rollerEl = (node: HTMLElement, creature: Creature) => {
        if (
            plugin.canUseDiceRoller &&
            rollerMap.has(creature) &&
            !rollerMap.get(creature)!.isStatic
        ) {
            node.appendChild(
                rollerMap.get(creature)?.containerEl ??
                    createSpan({ text: `${creatureMap.get(creature)}` })
            );
        } else {
            node.setText(`${creatureMap.get(creature)}`);
        }
    };

    const label = (creature: Creature) => {
        if (!creature) return;
        let label = [];
        if (creature.dc) {
            label.push(`DC: ${creature.dc.max}`);
        }
        if (creature.hp) {
            label.push(`HP: ${creature.hp.max}`);
        }
        if (creature.stress) {
            label.push(`STRESS: ${creature.stress.max}`);
        }
        return `${label.join(", ")}`;
    };

    $: allRolling =
        [...creatures.keys()].filter((c) => c.hit_dice?.length).length ==
            creatures.size;

    const rollEl = (node: HTMLElement) => {
        setIcon(node, RANDOM_HP);
    };
</script>

<div class="encounter-instance">
    <div class="encounter-name">
        <h3 data-heading={name} class="initiative-tracker-name">{name}</h3>
        <div class="icons">
            <div use:openButton on:click={open} aria-label="Start Encounter" />
            <div use:addButton on:click={add} aria-label="Add to Encounter" />
        </div>
    </div>
    <div class="creatures-container">
        {#if party}
            <div class="encounter-creatures encounter-players">
                <h4>Party: {party.name}</h4>
            </div>
        {:else}
            <div class="encounter-creatures encounter-players">
                <h4>No Party</h4>
            </div>
        {/if}
        <div class="encounter-creatures">
            {#if !hide.includes("creatures")}
                <h4 class="creatures-header">
                    Creatures
                    {#if allRolling}
                        <span
                            class="has-icon"
                            aria-label="Rolling for HP"
                            use:rollEl
                        />
                    {/if}
                </h4>
                {#if creatures.size}
                    <ul>
                        {#each [...creatures] as [creature, count]}
                            <li
                                aria-label={label(creature)}
                                class="creature-li"
                            >
                                <CreatureComponent
                                    {creature}
                                    xp={rpgSystem.getCreatureDifficulty(
                                        creature,
                                        party
                                    )}
                                    {count}
                                >
                                    <strong
                                        class="creature-amount"
                                        use:rollerEl={creature}
                                    />
                                </CreatureComponent>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <strong>No creatures</strong>
                {/if}
            {/if}
        </div>
        {#if plugin.data.displayDifficulty}
            <div class="encounter-xp difficulty">
                {#if difficulty}
                    <span
                        aria-label={difficulty.summary}
                        class={difficulty.cssClass}
                    >
                        <strong class="difficulty-label"
                            >{difficulty.displayName}</strong
                        >
                        <span class="xp-parent difficulty">
                            <span class="paren left">(</span>
                            <span class="xp-container">
                                {#if difficulty.value > 0}
                                    <span class="xp number"
                                        >{rpgSystem.formatDifficultyValue(
                                            difficulty.value
                                        )}</span
                                    >
                                    <span class="xp text"
                                        >{rpgSystem.valueUnit}</span
                                    >
                                {/if}
                            </span>
                            <span class="paren right">)</span>
                        </span>
                    </span>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .encounter-name {
        display: flex;
        justify-content: flex-start;
        align-items: center;
    }
    .encounter-name .initiative-tracker-name {
        margin: 0;
    }
    .encounter-instance
        > .creatures-container
        > .encounter-creatures:first-of-type
        h4,
    .encounter-creatures > ul {
        margin-top: 0;
    }
    .creature-li {
        width: fit-content;
    }
    .xp-parent {
        display: inline-flex;
    }
    .difficulty {
        width: fit-content;
    }
    .deadly .difficulty-label {
        color: red;
    }
    .hard .difficulty-label {
        color: orange;
    }
    .medium .difficulty-label {
        color: yellow;
    }
    .easy .difficulty-label {
        color: green;
    }
    .trivial .difficulty-label {
        color: #aaaaaa;
    }
    .icons {
        display: flex;
    }
    .icons > div:first-child :global(.clickable-icon) {
        margin-right: 0;
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
