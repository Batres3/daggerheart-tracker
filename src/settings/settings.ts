import {
    addIcon,
    ExtraButtonComponent,
    normalizePath,
    Notice,
    PluginSettingTab,
    setIcon,
    Setting,
    TextComponent,
    TFolder
} from "obsidian";

import type InitiativeTracker from "../main";

import { FileInputSuggest, FolderInputSuggest } from "obsidian-utilities";
import {
    DC,
    Conditions,
    DEFAULT_UNDEFINED,
    EDIT,
    HP,
    STRESS,
    OVERFLOW_TYPE,
    RESOLVE_TIES
} from "../utils";
import { RpgSystemSetting, getRpgSystem } from "../utils/rpg-system";
import type { Party } from "./settings.types";
import type { InputValidate } from "./settings.types";
import type { Condition } from "src/types/creatures";
import type { HomebrewCreature } from "src/types/creatures";

export default class InitiativeTrackerSettings extends PluginSettingTab {
    constructor(private plugin: InitiativeTracker) {
        super(plugin.app, plugin);
    }
    async display(): Promise<void> {
        try {
            let { containerEl } = this;

            containerEl.empty();
            containerEl.addClass("initiative-tracker-settings");

            containerEl.createEl("h2", { text: "Initiative Tracker Settings" });

            this._displayBase(containerEl.createDiv());
            if (!this.plugin.data.openState) {
                this.plugin.data.openState = {
                    battle: true,
                    player: true,
                    party: true,
                    plugin: true,
                    status: true,
                    builder: true
                };
            }
            this._displayBattle(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.player
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayParties(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.party
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayBuilder(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.builder
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayStatuses(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.status
                            ? { open: true }
                            : {})
                    }
                })
            );
            this._displayIntegrations(
                containerEl.createEl("details", {
                    cls: "initiative-tracker-additional-container",
                    attr: {
                        ...(this.plugin.data.openState.plugin
                            ? { open: true }
                            : {})
                    }
                })
            );

        } catch (e) {
            console.error(e);
            new Notice(
                "There was an error displaying the settings tab for Obsidian Initiative Tracker."
            );
        }
    }

    private _displayBase(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Basic Settings");
        new Setting(containerEl)
            .setName("Display Beginner Tips")
            .setDesc(
                "Display instructions in the initiative tracker, helping you get used to the workflow."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.beginnerTips).onChange(
                    async (v) => {
                        this.plugin.data.beginnerTips = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
        new Setting(containerEl)
            .setName("Display Encounter Difficulty")
            .setDesc(
                "Display encounter difficulty based on creature CR and player level. Creatures without CR or level will not be considered in the calculation."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.displayDifficulty).onChange(
                    async (v) => {
                        this.plugin.data.displayDifficulty = v;
                        await this.plugin.saveSettings();
                    }
                );
            });

        new Setting(containerEl)
            .setName("Embed statblock-link content in the Creature View")
            .setDesc(
                "Prefer embedded content from a statblock-link attribute when present. Fall back to the TTRPG plugin if the link is missing and the plugin is enabled."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.preferStatblockLink).onChange(
                    async (v) => {
                        this.plugin.data.preferStatblockLink = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
    }
    private async _displayBattle(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.battle = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Battle");
        summary.createDiv("collapser").createDiv("handle");
        new Setting(additionalContainer)
            .setName("Clamp Minimum HP")
            .setDesc(
                "When a creature takes damage that would reduce its HP below 0, its HP is set to 0 instead."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.clamp).onChange(async (v) => {
                    this.plugin.data.clamp = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Overflow Healing")
            .setDesc(
                "Set what happens to healing which goes above creatures' max HP threshold."
            )
            .addDropdown((d) => {
                d.addOption(OVERFLOW_TYPE.ignore, "Ignore");
                d.addOption(OVERFLOW_TYPE.temp, "Add to temp HP");
                d.addOption(OVERFLOW_TYPE.current, "Add to current HP");
                d.setValue(this.plugin.data.hpOverflow ?? OVERFLOW_TYPE.ignore);
                d.onChange(async (v) => {
                    this.plugin.data.hpOverflow = v;
                    this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Automatic Status Application")
            .setDesc(
                'Automatically apply status conditions like "Vulnerable" for 0 stress or "Dead" for 0 HP'
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.autoStatus).onChange(async (v) => {
                    this.plugin.data.autoStatus = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Display Player HP in Player View")
            .setDesc(
                "If turned off, player health will display as 'Healthy', 'Hurt', etc."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.diplayPlayerHPValues).onChange(
                    async (v) => {
                        this.plugin.data.diplayPlayerHPValues = v;
                        await this.plugin.saveSettings();
                    }
                );
            });

        new Setting(additionalContainer)
            .setName("Log Battles")
            .setDesc(
                "Actions taken during battle will be logged to the specified log folder."
            )
            .addToggle((t) =>
                t.setValue(this.plugin.data.logging).onChange(async (v) => {
                    this.plugin.data.logging = v;
                    await this.plugin.saveSettings();
                })
            );

        const exists = await this.plugin.app.vault.adapter.exists(
            this.plugin.data.logFolder
        );
        new Setting(additionalContainer)
            .setName("Log Folder")
            .setDesc(
                createFragment(async (e) => {
                    e.createSpan({
                        text: "A new note will be created in this folder for each battle."
                    });
                    e.createEl("br");
                    e.createSpan({ text: "Current: " });
                    e.createEl("code", { text: this.plugin.data.logFolder });

                    if (!exists) {
                        e.createEl("br");
                        const container = e.createDiv(
                            "initiative-tracker-warning"
                        );
                        setIcon(container, "initiative-tracker-warning");
                        container.createSpan({
                            text: "This folder does not exist and will be created when a log file is written for the first time."
                        });
                    }
                })
            )
            .addText((t) => {
                t.setValue(this.plugin.data.logFolder);
                let folders = this.app.vault
                    .getAllLoadedFiles()
                    .filter((f) => f instanceof TFolder);
                const modal = new FolderInputSuggest(
                    this.app,
                    t,
                    folders as TFolder[]
                );
                modal.onSelect(async ({ item }) => {
                    this.plugin.data.logFolder = normalizePath(item.path);
                    await this.plugin.saveSettings();
                    this.display();
                });
            });
    }

    private _displayBuilder(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.player = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Encounters");
        summary.createDiv("collapser").createDiv("handle");
        const explanation = additionalContainer.createDiv(
            "initiative-tracker-explanation"
        );
        explanation.createEl("span", {
            text: "The encounter builder allows you to quickly create encounters that can be saved for later use or immediately launched into a battle."
        });
        explanation.createEl("br");
        explanation.createEl("br");
        explanation.createEl("span", {
            text: "It can be opened using the sidebar shortcut (if enabled) or by using the Open Encounter Builder command."
        });
        new Setting(additionalContainer)
            .setName("Add Sidebar Shortcut")
            .setDesc(
                "A sidebar shortcut will be added to open the Encounter Builder."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.builder.sidebarIcon).onChange(
                    (v) => {
                        this.plugin.data.builder.sidebarIcon = v;
                        this.plugin.setBuilderIcon();
                    }
                );
            });
        new Setting(additionalContainer)
            .setName("XP System")
            .setDesc("XP system to use for encounters")
            .addDropdown((d) => {
                Object.values(RpgSystemSetting).forEach((system) =>
                    d.addOption(
                        system,
                        getRpgSystem(this.plugin, system).displayName
                    )
                );
                d.setValue(
                    this.plugin.data.rpgSystem ?? RpgSystemSetting.Dnd5e
                );
                d.onChange(async (v) => {
                    this.plugin.data.rpgSystem = v;
                    this.plugin.saveSettings();
                });
            });

        const additional = additionalContainer.createDiv("additional");
        new Setting(additional).setHeading().setName("Saved Encounters");
        if (!Object.keys(this.plugin.data.encounters).length) {
            additional
                .createDiv({
                    attr: {
                        style: "display: flex; justify-content: center; padding-bottom: 18px;"
                    }
                })
                .createSpan({
                    text: "No saved encounters! Create one to see it here."
                });
        } else {
            for (const [name, encounter] of Object.entries(
                this.plugin.data.encounters
            )) {
                new Setting(additional)
                    .setName(name)
                    .setDesc(
                        createFragment((e) => {
                            const players = [],
                                creatures = [];
                            for (const creature of encounter.creatures) {
                                if (creature.player) {
                                    players.push(creature.name);
                                } else {
                                    creatures.push(creature.name);
                                }
                            }

                            if (players.length) {
                                e.createSpan({
                                    text: `Players: ${players.join(", ")}`
                                });
                                e.createEl("br");
                            }
                            if (creatures.length) {
                                e.createSpan({
                                    text: `Creatures: ${creatures.join(", ")}`
                                });
                                e.createEl("br");
                            }

                            if (encounter.timestamp) {
                                e.createSpan({
                                    text: `${new Date(
                                        encounter.timestamp
                                    ).toLocaleString()}`
                                });
                            }
                        })
                    )
                    .addExtraButton((b) => {
                        b.setIcon("trash").onClick(async () => {
                            this.plugin.removeEncounter(name);
                            await this.plugin.saveSettings();
                            this._displayBuilder(additionalContainer);
                        });
                    });
            }
        }
    }
    private _displayParties(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.party = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Parties");
        summary.createDiv("collapser").createDiv("handle");
        const explanation = additionalContainer.createDiv(
            "initiative-tracker-explanation"
        );
        explanation.createEl("span", {
            text: "Parties are defined by the number of players within them and the level of the party"
        });
        explanation.createEl("br");
        explanation.createEl("br");
        explanation.createEl("span", {
            text: "You can set a default party for encounters to use, or specify the party for the encounter in the encounter block. The only use for parties is for tracking battle points"
        });
        new Setting(additionalContainer)
            .setName("Default Party")
            .setDesc(
                "This party will be used by default to track battle points."
            )
            .addDropdown((d) => {
                d.addOption("none", "None");
                for (const party of this.plugin.data.parties) {
                    d.addOption(party.name, party.name);
                }
                d.setValue(this.plugin.data.defaultParty ?? "none");
                d.onChange(async (v) => {
                    this.plugin.data.defaultParty = v == "none" ? null : v;
                    this.plugin.saveSettings();
                });
            });
        new Setting(additionalContainer)
            .setName("Add New Party")
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add Party")
                    .setButtonText("+")
                    .onClick(async () => {
                        const modal = new PartyModal(this.plugin);
                        modal.open();
                        modal.onClose = async () => {
                            if (modal.canceled) return;
                            if (!modal.party.name || !modal.party.name.length)
                                return;
                            if (
                                this.plugin.data.parties.filter(
                                    (party) => party.name == modal.party.name
                                )
                            ) {
                                const map = new Map(
                                    [...this.plugin.data.parties].map((c) => [
                                        c.name,
                                        c
                                    ])
                                );
                                map.set(modal.party.name, modal.party);
                                this.plugin.data.parties = Array.from(
                                    map.values()
                                );
                            } else {
                                this.plugin.data.parties.push(modal.party);
                            }

                            await this.plugin.saveSettings();

                            this._displayParties(additionalContainer);
                        };
                    });

                return b;
            });
        const additional = additionalContainer.createDiv("additional");
        if (!this.plugin.data.parties.length) {
            additional
                .createDiv({
                    attr: {
                        style: "display: flex; justify-content: center; padding-bottom: 18px;"
                    }
                })
                .createSpan({
                    text: "No saved parties! Create one to see it here."
                });
        } else {
            for (const party of this.plugin.data.parties) {
                new Setting(additional)
                    .setName(party.name)
                    .setDesc(`${party.players} Players of level ${party.level}`)
                    .addExtraButton((b) => {
                        b.setIcon("pencil").onClick(() => {
                            const modal = new PartyModal(this.plugin, party);
                            modal.open();
                            modal.onClose = async () => {
                                if (modal.canceled) return;
                                if (
                                    !modal.party.name ||
                                    !modal.party.name.length
                                )
                                    return;

                                this.plugin.data.parties.splice(
                                    this.plugin.data.parties.indexOf(party),
                                    1,
                                    modal.party
                                );
                                if (
                                    this.plugin.data.parties.filter(
                                        (s) => s.name == modal.party.name
                                    ).length > 1
                                ) {
                                    if (
                                        this.plugin.data.parties.filter(
                                            (status) =>
                                                status.name == modal.party.name
                                        )
                                    ) {
                                        const map = new Map(
                                            this.plugin.data.parties.map(
                                                (c) => [c.name, c]
                                            )
                                        );
                                        map.set(modal.party.name, modal.party);
                                        this.plugin.data.parties = Array.from(
                                            map.values()
                                        );
                                    }
                                }

                                await this.plugin.saveSettings();

                                this._displayParties(additionalContainer);
                            };
                        });
                    })
                    .addExtraButton((b) => {
                        b.setIcon("trash").onClick(async () => {
                            this.plugin.data.parties =
                                this.plugin.data.parties.filter(
                                    (p) => p.name != party.name
                                );
                            if (this.plugin.data.defaultParty == party.name) {
                                this.plugin.data.defaultParty =
                                    this.plugin.data.parties[0]?.name ?? null;
                            }
                            await this.plugin.saveSettings();
                            this._displayParties(additionalContainer);
                        });
                    });
            }
        }
    }
    private _displayStatuses(additionalContainer: HTMLDetailsElement) {
        additionalContainer.empty();
        additionalContainer.ontoggle = () => {
            this.plugin.data.openState.status = additionalContainer.open;
        };
        const summary = additionalContainer.createEl("summary");
        new Setting(summary).setHeading().setName("Statuses");

        new Setting(additionalContainer)
            .setName("Unconscious Status")
            .setDesc(
                "Choose a different status to be used as the default Unconscious status."
            )
            .addDropdown((d) => {
                for (const status of this.plugin.data.statuses) {
                    d.addOption(status.id, status.name);
                }
                d.setValue(this.plugin.data.unconsciousId);
                d.onChange((id) => (this.plugin.data.unconsciousId = id));
            });
        summary.createDiv("collapser").createDiv("handle");
        const add = new Setting(additionalContainer)
            .setName("Add New Status")
            .setDesc("These statuses will be available to apply to creatures.")
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add Status")
                    .setButtonText("+")
                    .onClick(async () => {
                        const modal = new StatusModal(this.plugin);
                        modal.onClose = async () => {
                            if (modal.canceled) return;
                            if (!modal.status.name) return;
                            if (
                                this.plugin.data.statuses.filter(
                                    (status) => status.name == modal.status.name
                                )
                            ) {
                                const map = new Map(
                                    [...this.plugin.data.statuses].map((c) => [
                                        c.name,
                                        c
                                    ])
                                );
                                map.set(modal.status.name, modal.status);
                                this.plugin.data.statuses = Array.from(
                                    map.values()
                                );
                            } else {
                                this.plugin.data.statuses.push(modal.status);
                            }
                            await this.plugin.saveSettings();
                            this._displayStatuses(additionalContainer);
                        };
                        modal.open();
                    });

                return b;
            });
        if (!Conditions.every((c) => this.plugin.data.statuses.includes(c))) {
            add.addExtraButton((b) =>
                b
                    .setIcon("reset")
                    .setTooltip("Re-add Default Statuses")
                    .onClick(async () => {
                        this.plugin.data.statuses = Array.from(
                            new Map(
                                [
                                    ...this.plugin.data.statuses,
                                    ...Conditions
                                ].map((c) => [c.name, c])
                            ).values()
                        );
                        await this.plugin.saveSettings();
                        this._displayStatuses(additionalContainer);
                    })
            );
        }
        const additional = additionalContainer.createDiv("additional");
        for (const status of this.plugin.data.statuses) {
            new Setting(additional)
                .setName(
                    createFragment((e) => {
                        const div = e.createDiv("status-name-container");
                        div.createSpan({ text: status.name });

                        div.createDiv("status-metadata-container");
                        if (status.resetOnRound) {
                            setIcon(
                                div.createDiv({
                                    attr: {
                                        "aria-label": "Reset Each Round"
                                    }
                                }),
                                "timer-reset"
                            );
                        }
                        if (status.hasAmount) {
                            setIcon(
                                div.createDiv({
                                    attr: {
                                        "aria-label": "Has Amount"
                                    }
                                }),
                                "hash"
                            );
                        }
                    })
                )
                .setDesc(status.description ?? "")
                .addExtraButton((b) =>
                    b.setIcon("pencil").onClick(() => {
                        const modal = new StatusModal(this.plugin, status);
                        modal.onClose = async () => {
                            if (modal.canceled) return;
                            if (!modal.status.name) return;
                            this.plugin.data.statuses.splice(
                                this.plugin.data.statuses.indexOf(status),
                                1,
                                modal.status
                            );
                            if (
                                this.plugin.data.statuses.filter(
                                    (s) => s.name == modal.status.name
                                ).length > 1
                            ) {
                                if (
                                    this.plugin.data.statuses.filter(
                                        (status) =>
                                            status.name == modal.status.name
                                    )
                                ) {
                                    const map = new Map(
                                        this.plugin.data.statuses.map((c) => [
                                            c.name,
                                            c
                                        ])
                                    );
                                    map.set(modal.status.name, modal.status);
                                    this.plugin.data.statuses = Array.from(
                                        map.values()
                                    );
                                }
                            }
                            await this.plugin.saveSettings();
                            this._displayStatuses(additionalContainer);
                        };
                        modal.open();
                    })
                )
                .addExtraButton((b) =>
                    b.setIcon("trash").onClick(async () => {
                        this.plugin.data.statuses =
                            this.plugin.data.statuses.filter(
                                (s) => s.name != status.name
                            );
                        if (this.plugin.data.unconsciousId == status.id) {
                            this.plugin.data.unconsciousId = "Unconscious";
                        }
                        await this.plugin.saveSettings();
                        this._displayStatuses(additionalContainer);
                    })
                )
                .setClass("initiative-status-item");
        }
    }
    private async _displayIntegrations(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        containerEl.ontoggle = () => {
            this.plugin.data.openState.plugin = containerEl.open;
        };
        const summary = containerEl.createEl("summary");
        new Setting(summary).setHeading().setName("Plugin Integrations");
        summary.createDiv("collapser").createDiv("handle");
        if (!this.plugin.canUseStatBlocks) {
            this.plugin.data.sync = false;
            await this.plugin.saveSettings();
        }
        new Setting(containerEl)
            .setName("Sync Monsters from Fantasy Statblocks")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Homebrew creatures saved to the Fantasy Statblocks plugin will be available to use."
                    });
                    if (!this.plugin.canUseStatBlocks) {
                        e.createEl("br");
                        e.createEl("br");
                        e.createSpan({
                            text: "Install and enable the "
                        });
                        e.createEl("a", {
                            text: "Fantasy Statblocks",
                            href: "obsidian://show-plugin?id=obsidian-5e-statblocks"
                        });
                        e.createSpan({
                            text: " plugin to use homebrew creatures."
                        });
                    }
                })
            )
            .addToggle((t) => {
                t.setDisabled(!this.plugin.canUseStatBlocks).setValue(
                    this.plugin.data.sync
                );
                t.onChange(async (v) => {
                    this.plugin.data.sync = v;
                    await this.plugin.saveSettings();
                    this._displayIntegrations(containerEl);
                });
            });
        if (this.plugin.data.sync) {
            const synced = new Setting(containerEl).setDesc(
                `${this.plugin.bestiary.length} creatures synced.`
            );
            synced.settingEl.addClass("initiative-synced");
            setIcon(synced.nameEl, "check-in-circle");
            synced.nameEl.appendChild(createSpan({ text: "Synced" }));
        }

    }
}

import { App, ButtonComponent, Modal } from "obsidian";
import { tracker } from "src/tracker/stores/tracker";
import { getId } from "src/utils/creature";

export async function confirmWithModal(
    app: App,
    text: string,
    buttons: { cta: string; secondary: string } = {
        cta: "Yes",
        secondary: "No"
    }
): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const modal = new ConfirmModal(app, text, buttons);
        modal.onClose = () => {
            resolve(modal.confirmed);
        };
        modal.open();
    });
}

export class ConfirmModal extends Modal {
    constructor(
        app: App,
        public text: string,
        public buttons: { cta: string; secondary: string }
    ) {
        super(app);
    }
    confirmed: boolean = false;
    async display() {
        new Promise((resolve) => {
            this.contentEl.empty();
            this.contentEl.addClass("confirm-modal");
            this.contentEl.createEl("p", {
                text: this.text
            });
            const buttonEl = this.contentEl.createDiv(
                "fantasy-calendar-confirm-buttons"
            );
            new ButtonComponent(buttonEl)
                .setButtonText(this.buttons.cta)
                .setCta()
                .onClick(() => {
                    this.confirmed = true;
                    this.close();
                });
            new ButtonComponent(buttonEl)
                .setButtonText(this.buttons.secondary)
                .onClick(() => {
                    this.close();
                });
        });
    }
    onOpen() {
        this.display();
    }
}
addIcon(
    "initiative-tracker-warning",
    `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="exclamation-triangle" class="svg-inline--fa fa-exclamation-triangle fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>`
);

class StatusModal extends Modal {
    status: Condition = { name: null, description: null, id: getId() };
    canceled = false;
    editing: boolean = false;
    original: string;
    constructor(public plugin: InitiativeTracker, status?: Condition) {
        super(plugin.app);
        if (status) {
            this.editing = true;
            this.original = status.name;
            this.status = {
                name: status.name,
                description: status.description,
                id: status.id ?? getId()
            };
        }
    }
    onOpen() {
        this.titleEl.setText(this.editing ? "Edit Status" : "New Status");
        this.contentEl.empty();
        const name = new Setting(this.contentEl)
            .setName("Name")
            .addText((t) => {
                t.setValue(this.status.name).onChange((v) => {
                    this.status.name = v;
                    if (
                        this.plugin.data.statuses.find(
                            (s) => s.name == this.status.name
                        ) &&
                        this.original != this.status.name
                    ) {
                        name.setDesc(
                            createFragment((e) => {
                                const container = e.createDiv(
                                    "initiative-tracker-warning"
                                );
                                setIcon(
                                    container,
                                    "initiative-tracker-warning"
                                );
                                container.createSpan({
                                    text: "A status by this name already exists and will be overwritten."
                                });
                            })
                        );
                    } else {
                        name.setDesc("");
                    }
                });
            });
        new Setting(this.contentEl).setName("Description").addTextArea((t) => {
            t.setValue(this.status.description).onChange(
                (v) => (this.status.description = v)
            );
        });
        new Setting(this.contentEl)
            .setName("Remove Each Round")
            .setDesc(
                "This status will be removed from all creatures at the start of a new round."
            )
            .addToggle((t) =>
                t
                    .setValue(this.status.resetOnRound)
                    .onChange((v) => (this.status.resetOnRound = v))
            );
        new Setting(this.contentEl)
            .setName("Has Amount")
            .setDesc(
                "This status has an amount that can be increased or decreased during combat."
            )
            .addToggle((t) =>
                t.setValue(this.status.hasAmount).onChange((v) => {
                    this.status.hasAmount = v;
                    this.onOpen();
                })
            );
        if (this.status.hasAmount) {
            new Setting(this.contentEl)
                .setName("Starting Amount")
                .setDesc("The status will default to this amount when added.")
                .addText(
                    (t) =>
                    (t
                        .setValue(`${this.status.startingAmount}`)
                        .onChange((v) => {
                            this.status.amount =
                                this.status.startingAmount = Number(v);
                        }).inputEl.type = "number")
                );
        }

        const buttonContainer = this.contentEl.createDiv("initiative-tracker-buttons");

        new ButtonComponent(
            buttonContainer.createDiv("initiative-tracker-cancel")
        )
            .setButtonText("Cancel")
            .onClick(() => {
                this.canceled = true;
                this.close();
            });
        new ButtonComponent(
            buttonContainer.createDiv("initiative-tracker-cancel")
        )
            .setButtonText("Save")
            .onClick(() => {
                this.close();
            });
    }
}

class PartyModal extends Modal {
    party: Party = { name: null, players: 0, level: 0 };
    canceled = false;
    editing = false;
    original: string;
    constructor(public plugin: InitiativeTracker, party?: Party) {
        super(plugin.app);
        if (party) {
            this.editing = true;
            this.original = party.name;
            this.party = {
                name: party.name,
                players: party.players,
                level: party.level
            };
        }
    }
    onOpen(): void {
        this.titleEl.setText(
            this.editing ? `Edit ${this.party.name ?? "Party"}` : "New Party"
        );

        const name = new Setting(this.contentEl)
            .setName("Name")
            .addText((t) => {
                t.setValue(this.party.name).onChange((v) => {
                    this.party.name = v;
                    if (
                        this.plugin.data.parties.find(
                            (s) => s.name == this.party.name
                        ) &&
                        this.original != this.party.name
                    ) {
                        name.setDesc(
                            createFragment((e) => {
                                const container = e.createDiv(
                                    "initiative-tracker-warning"
                                );
                                setIcon(
                                    container,
                                    "initiative-tracker-warning"
                                );
                                container.createSpan({
                                    text: "A party by this name already exists and will be overwritten."
                                });
                            })
                        );
                    } else {
                        name.setDesc("");
                    }
                });
            });

        const players = new Setting(this.contentEl)
            .setName("Number of Players")
            .addText((t) => {
                t.setValue("").onChange((v) => {
                    const num = Number(v);
                    if ((isNaN(num) || num <= 0)) {
                        players.setDesc(
                            createFragment((e) => {
                                const container = e.createDiv(
                                    "initiative-tracker-warning"
                                );
                                setIcon(
                                    container,
                                    "initiative-tracker-warning"
                                );
                                container.createSpan({
                                    text: "Please enter a valid number of players (greater than 0)"
                                });
                            })
                        );
                    } else {
                        this.party.players = num;
                        players.setDesc("");
                    }
                });
            });

        const level = new Setting(this.contentEl)
            .setName("Level of the party")
            .addText((t) => {
                t.setValue("").onChange((v) => {
                    const num = Number(v);
                    if ((isNaN(num) || num < 1 || num > 10)) {
                        level.setDesc(
                            createFragment((e) => {
                                const container = e.createDiv(
                                    "initiative-tracker-warning"
                                );
                                setIcon(
                                    container,
                                    "initiative-tracker-warning"
                                );
                                container.createSpan({
                                    text: "Please enter a valid level (between 1 and 10)"
                                });
                            })
                        );
                    } else {
                        this.party.level = num;
                        level.setDesc("");
                    }
                });
            });

        const buttonContainer = this.contentEl.createDiv("initiative-tracker-buttons");

        new ButtonComponent(
            buttonContainer.createDiv("initiative-tracker-cancel")
        )
            .setButtonText("Cancel")
            .onClick(() => {
                this.canceled = true;
                this.close();
            });
        new ButtonComponent(
            buttonContainer.createDiv("initiative-tracker-cancel")
        )
            .setButtonText("Save")
            .onClick(() => {
                this.close();
            });
    }
}
