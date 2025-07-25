<script lang="ts">
    import {
        ExtraButtonComponent,
        Notice,
        ToggleComponent,
        TextComponent,
        Platform
    } from "obsidian";

    import { onMount } from "svelte";

    import { DICE } from "src/utils";
    import { SRDMonsterSuggestionModal } from "src/utils/suggester";
    import { Creature } from "src/utils/creature";
    import type InitiativeTracker from "src/main";
    import type { Writable } from "svelte/store";
    import { equivalent } from "src/encounter";
    import { confirmWithModal } from "./modal";

    let creature: Creature = new Creature({});
    export let amount = 1;
    export let plugin: InitiativeTracker;
    export let adding: Writable<Array<[Creature, number]>>;
    export let editing: Writable<Creature>;
    export let isEditing: boolean;

    editing.subscribe((c) => {
        if (!c) return;
        creature = c;
    });

    $: {
        if (Platform.isMobile) {
            $adding.splice(0, 1, [creature, amount]);
        }
    }

    const saveButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setTooltip("Add Creature")
            .setIcon("plus")
            .onClick(async () => {
                if (!creature || !creature.name || !creature.name?.length) {
                    new Notice("Enter a name!");
                    return;
                }
                let existing = $adding.findIndex(([k]) =>
                    equivalent(k, creature)
                );
                if (existing > -1) {
                    $adding[existing][1] += amount;
                } else {
                    $adding.push([creature, amount]);
                }
                $adding = $adding;
                $editing = null;
                creature = new Creature({});
            });
    };
    const editButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setTooltip("Add Creature")
            .setIcon("save")
            .onClick(async () => {
                if (!creature || !creature.name || !creature.name?.length) {
                    new Notice("Enter a name!");
                    return;
                }
                let existing = $adding.findIndex(
                    ([k]) => k != creature && equivalent(k, creature)
                );
                if (
                    existing > -1 &&
                    (await confirmWithModal(
                        app,
                        `This will merge ${creature.name} with ${$adding[existing][0].name}.`
                    ))
                ) {
                    const index = $adding.findIndex(([k]) => k == creature);
                    $adding[existing][1] += $adding[index][1];
                    $adding.splice(index, 1);
                }
                $adding = $adding;
                $editing = null;
                creature = new Creature({});
            });
    };
    const cancelButton = (node: HTMLElement) => {
        new ExtraButtonComponent(node)
            .setTooltip("Cancel")
            .setIcon("reset")
            .onClick(() => {
                creature = new Creature({});
            });
    };
    let nameInput: TextComponent, displayNameInput: HTMLInputElement;
    const name = (node: HTMLElement) => {
        nameInput = new TextComponent(node)
            .setValue(creature.name)
            .onChange((v) => (creature.name = v));
    };
    let modal: SRDMonsterSuggestionModal;
    const createModal = () => {
        modal = new SRDMonsterSuggestionModal(
            plugin.app,
            nameInput,
            plugin.bestiary
        );
        modal.onSelect(async (selected) => {
            if (selected.item) {
                creature = Creature.from(selected.item);
                nameInput.setValue(creature.name);
            }
            modal.close();
        });
    };

    onMount(() => {
        if (isEditing) {
            setImmediate(() => {
                displayNameInput.focus();
                createModal();
            });
        } else {
            createModal();
        }
    });
    const hideToggle = (div: HTMLDivElement) => {
        new ToggleComponent(div)
            .setValue(creature.hidden)
            .onChange((v) => (creature.hidden = v));
    };
    const friendToggle = (div: HTMLDivElement) => {
        new ToggleComponent(div)
            .setValue(creature.friendly)
            .onChange((v) => (creature.friendly = v));
    };
</script>

<div class="initiative-tracker-editor">
    <div class="create-new">
        <div>
            <label for="add-name">Creature</label>
            <div use:name id="add-name" />
        </div>
        <div>
            <label for="add-display">Display Name</label>
            <input
                bind:value={creature.display}
                bind:this={displayNameInput}
                id="add-display"
                type="text"
                name="display"
                tabindex="0"
            />
        </div>
        <div>
            <label for="add-dc">Difficulty</label>
            <input
                bind:value={creature.dc.max}
                id="add-dc"
                name="dc"
                type="number"
                tabindex="0"
            />
        </div>
        <div>
            <label for="add-hp">HP</label>
            <input
                bind:value={creature.hp.max}
                id="add-hp"
                type="number"
                name="hp"
                tabindex="0"
            />
        </div>
        <div>
            <label for="add-stress">Stress</label>
            <input
                bind:value={creature.stress.max}
                id="add-stress"
                type="number"
                name="stress"
                tabindex="0"
            />
        </div>

        {#key creature}
            <div>
                <label for="add-mod">Hidden</label>
                <div use:hideToggle />
            </div>
            <div>
                <label for="add-mod">Friendly</label>
                <div use:friendToggle />
            </div>
        {/key}

        <div class="amount">
            <label for="add-init">Amount</label>
            <input
                bind:value={amount}
                id="add-init"
                type="number"
                name="initiative"
                tabindex="0"
            />
        </div>
    </div>
    {#if !isEditing && !Platform.isMobile}
        <div class="context-buttons">
            <div use:cancelButton class="add-button cancel-button" />
            {#if $editing}
                <div class="add-button" use:editButton />
            {:else}
                <div class="add-button" use:saveButton />
            {/if}
        </div>
    {/if}
</div>

<style>
    .create-new > * {
        display: grid;
        grid-template-columns: 33% 66%;
        margin-bottom: 0.5rem;
    }
    .context-buttons {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        grid-gap: 0.125rem;
    }
    .cancel-button {
        color: var(--text-faint);
    }
</style>
