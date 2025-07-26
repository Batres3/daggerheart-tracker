import { Modal } from "obsidian";

import type InitiativeTracker from "src/main";
import Headers from "./Headers.svelte";
import type { TableHeaderState } from "src/builder/builder.types";
import copy from "fast-copy";

export class HeadersModal extends Modal {
    canceled: boolean = false;
    reset = false;
    constructor(plugin: InitiativeTracker, public headers: TableHeaderState[]) {
        super(plugin.app);
    }
    onOpen() {
        this.titleEl.setText("Edit Headers");
        const app = new Headers({
            target: this.contentEl,
            props: {
                headers: copy(this.headers)
            }
        });
        app.$on("update", (evt) => {
            this.headers = copy(evt.detail);
        });
        app.$on("cancel", () => {
            this.canceled = true;
            this.close();
        });
        app.$on("reset", () => {
            this.reset = true;
            this.close();
        });
    }
}
