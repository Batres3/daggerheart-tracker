<script lang="ts">
    import { setIcon, Setting } from "obsidian";
    import type { Party } from "src/settings/settings.types.ts"

    import { getContext } from "svelte";
    import { DISABLE, ENABLE } from "src/utils";

    import Experience from "./Experience.svelte";
    import Collapsible from "./Collapsible.svelte";

    import { party } from "src/builder/stores/party.ts"

    const plugin = getContext("plugin");

    const open = plugin.data.builder.showParty;

    const parties = plugin.data.parties;

    const partyDropdown = (node: HTMLElement) => {
        new Setting(node).setName("Select a party").addDropdown((dropdown) => {
            dropdown
                .addOption("none", "None")
                .addOptions(
                    Object.fromEntries(parties.map((p) => [p.name, p.name]))
                )
                .onChange((name) => {
                    if (name == "none") party.empty();
                    else party.set({...plugin.findParty(name)});
                });
            if (plugin.data.defaultParty) {
                dropdown.setValue(plugin.data.defaultParty);
                party.set({...plugin.defaultParty});
            }
        });
    };

    const enable = (node: HTMLElement) => {
        setIcon(node, ENABLE);
    };
    const disable = (node: HTMLElement) => {
        setIcon(node, DISABLE);
    };

    const addIcon = (node: HTMLElement) => {
        setIcon(node, "plus-with-circle");
    };
    const crossIcon = (node: HTMLElement) => {
        setIcon(node, "x");
    };

    const removeIcon = (node: HTMLElement) => {
        setIcon(node, "x-square");
    };
</script>

<div class="players-container">
    <Collapsible
        {open}
        on:toggle={() =>
            plugin.data.builder.showParty = !plugin.data.builder.showParty
        }>
        <h5 class="player-header" slot="title">Party</h5>
        <div slot="content">
            <div class="party">
                {#if parties.length}
                    <div use:partyDropdown></div>
                {/if}
            </div>

            {#if $party.name == ""}
                <div class="players">
                    <div class="player">
                        <input
                            type="number"
                            min="1"
                            value={$party.players}
                            on:input={(evt) =>
                                $party.players = Number(evt.currentTarget.value)
                            }
                        />
                        <span>Player(s)</span>
                        <div use:crossIcon></div>

                        <span>Level</span>
                        <input
                            type="number"
                            min="1"
                            value={$party.level}
                            on:input={(evt) =>
                                $party.level = Number(evt.currentTarget.value)
                            }
                        />
                    </div>
                </div>
            {/if}
        </div>
    </Collapsible>
</div>

<style scoped>
    .players {
        display: flex;
        flex-flow: column;
        gap: 0.25rem;
    }
    .player {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    input {
        text-align: center;
        width: 40px;
    }
</style>
