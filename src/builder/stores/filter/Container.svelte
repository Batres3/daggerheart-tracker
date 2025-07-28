<script lang="ts">
    import { createEventDispatcher, setContext } from "svelte";
    import {
        type BuiltFilterStore,
        DEFAULT_NEW_FILTER,
        type Filter,
        type FilterLayout
    } from "./filter";
    import Filters from "./Filters.svelte";
    import { ButtonComponent, Setting } from "obsidian";
    import copy from "fast-copy";
    import { getId } from "src/utils/creature";

    export let filterStore: BuiltFilterStore;
    const { layout, filters } = filterStore;
    const dispatch = createEventDispatcher<{
        cancel: null;
        update: FilterLayout;
    }>();

    setContext<BuiltFilterStore>("filterStore", filterStore);

    $: copied = copy($layout);
    $: dispatch("update", copied);

    filters.subscribe(() => {
        if (copied) copied = [...copied];
    });

    const reset = (node: HTMLElement) => {
        new Setting(node)
            .setName("Restore Default Layout")
            .addExtraButton((b) => {
                b.setIcon("reset").onClick(() => {
                    filterStore.resetLayout(true);
                });
            });
    };
    const add = (node: HTMLElement) => {
        new Setting(node).setName("Add New Filter").addExtraButton((b) => {
            b.setIcon("plus-circle").onClick(() => {
                const id = getId();
                const filter = {
                    ...DEFAULT_NEW_FILTER,
                    id
                };
                copied.push({
                    type: "nested",
                    id: getId(),
                    nested: [
                        {
                            type: "filter",
                            id
                        }
                    ]
                });
                filterStore.add(filter);
            });
        });
    };
    const cancel = (node: HTMLElement) => {
        new ButtonComponent(node).setButtonText("Cancel").setCta();
    };
</script>

<div use:reset></div>
<div use:add></div>

{#key copied}
    {#each copied as block}
        <Filters
            layout={copied}
            {block}
            inline={true}
            on:update={() => dispatch("update", copied)}
        ></Filters>
    {/each}
{/key}
<div class="cancel-button">
    <button type="button" use:cancel on:click={() => dispatch("cancel")}></button>
</div>
