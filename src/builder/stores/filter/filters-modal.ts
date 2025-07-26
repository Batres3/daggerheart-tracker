import { Modal, Setting } from "obsidian";
import type InitiativeTracker from "src/main";

import copy from "fast-copy";
import Filters from "./Container.svelte";
import EditFilter from "./EditFilter.svelte";
import type { BuiltFilterStore, Filter, FilterLayout } from "./filter";

export class FiltersModal extends Modal {
    canceled: boolean = false;
    reset = false;
    layout: FilterLayout;
    constructor(plugin: InitiativeTracker, layout: FilterLayout, public filterStore: BuiltFilterStore) {
        super(plugin.app);
        this.layout = copy(layout);
    }
    onOpen() {
        this.titleEl.setText("Edit Filters");
        const app = new Filters({
            target: this.contentEl,
            props: {
                filterStore: this.filterStore
            }
        });
        app.$on("update", (evt) => {
            this.layout = copy(evt.detail);
        });
        app.$on("cancel", () => {
            this.canceled = true;
            this.close();
        });
    }
}

export class EditFilterModal extends Modal {
    canceled = false;
    filter: Filter;
    constructor(plugin: InitiativeTracker, public original: Filter) {
        super(plugin.app);
        this.filter = copy(original);
    }
    onOpen(): void {
        this.titleEl.setText("Edit Filter");
        const app = new EditFilter({
            target: this.contentEl,
            props: {
                filter: this.filter,
                original: this.original
            }
        });

        app.$on("update", (evt) => {
            this.filter = evt.detail;
        });
        app.$on("cancel", (evt) => {
            this.canceled = true;
            this.close();
        });
    }
}
