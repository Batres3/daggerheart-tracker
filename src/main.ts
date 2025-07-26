import {
    type FrontMatterCache,
    Notice,
    parseYaml,
    Plugin,
    TFile,
    WorkspaceLeaf,
    setIcon
} from "obsidian";

import {
    BUILDER_VIEW,
    Conditions,
    CREATURE_TRACKER_VIEW,
    DEFAULT_SETTINGS,
    INITIATIVE_TRACKER_VIEW,
    registerIcons
} from "./utils";

import { PLAYER_VIEW_VIEW } from "./utils/constants";
import type { InitiativeTrackerData } from "./settings/settings.types";
import type { InitiativeViewState } from "./tracker/view.types";
import type { HomebrewCreature, SRDMonster } from "./types/creatures";
import { srd_from_statblocks } from "./types/creatures";
import InitiativeTrackerSettings from "./settings/settings";
import { EncounterBlock, EncounterParser } from "./encounter";
import EncounterLine from "./encounter/ui/EncounterLine.svelte";
import { Creature, getId } from "./utils/creature";
import TrackerView, { CreatureView } from "./tracker/view";
import BuilderView from "./builder/view";
import PlayerView from "./tracker/player-view";
import { tracker } from "./tracker/stores/tracker";
import { EncounterSuggester } from "./encounter/editor-suggestor";
import { API } from "./api/api";

import "@javalent/fantasy-statblocks";
import type { StackRoller } from "@javalent/dice-roller";

export default class InitiativeTracker extends Plugin {
    api = new API(this);
    public data: InitiativeTrackerData;
    public tracker = tracker;
    watchers: Map<TFile, HomebrewCreature> = new Map();
    getRoller(str: string) {
        if (!this.canUseDiceRoller) return;
        const roller = window.DiceRoller.getRoller(str, "statblock");
        if (roller === null) return null;
        return roller as StackRoller;
    }
    get canUseDiceRoller() {
        if (window.DiceRoller != null) {
            if (!window.DiceRoller.getRoller) {
                new Notice(
                    "Please update Dice Roller to the latest version to use with Initiative Tracker."
                );
            } else {
                return true;
            }
        }
        return false;
    }

    get canUseStatBlocks(): boolean {
        if (this.app.plugins.enabledPlugins.has("obsidian-5e-statblocks")) {
            return (window["FantasyStatblocks"]?.getVersion()?.major ?? 0) >= 4;
        }
        return false;
    }
    get statblockVersion() {
        return window.FantasyStatblocks?.getVersion() ?? { major: 0 };
    }
    get statblock_creatures() {
        if (!window.FantasyStatblocks) return [];
        return window.FantasyStatblocks.getBestiaryCreatures().map(srd_from_statblocks) as SRDMonster[];
    }
    get bestiary() {
        return this.statblock_creatures.filter(
            (p) => p.bestiary !== false && p.environment == false
        );
    }

    addEncounter(name: string, encounter: InitiativeViewState) {
        this.data.encounters[name] = encounter;
        this.registerCommand(name);
    }
    removeEncounter(name: string) {
        delete this.data.encounters[name];
        this.unregisterCommandsFor(name);
    }

    registerCommand(encounter: string) {
        this.addCommand({
            id: `start-${encounter}`,
            name: `Start ${encounter}`,
            checkCallback: (checking) => {
                // checking if the command should appear in the Command Palette
                if (checking) {
                    // make sure the active view is a MarkdownView.
                    return encounter in this.data.encounters;
                }
                if (!(encounter in this.data.encounters)) return;
                tracker.new(this, this.data.encounters[encounter]);
            }
        });
    }
    unregisterCommandsFor(encounter: string) {
        if (
            this.app.commands.findCommand(
                `initiative-tracker:start-${encounter}`
            )
        ) {
            delete this.app.commands.commands[
                `initiative-tracker:start-${encounter}`
            ];
        }
    }

    get bestiaryNames(): string[] {
        if (!window.FantasyStatblocks) return [];
        return window.FantasyStatblocks.getBestiaryNames();
    }
    get view() {
        const leaves = this.app.workspace.getLeavesOfType(
            INITIATIVE_TRACKER_VIEW
        );
        const leaf = leaves?.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof TrackerView)
            return leaf.view;
    }
    get combatant() {
        const leaves = this.app.workspace.getLeavesOfType(
            CREATURE_TRACKER_VIEW
        );
        const leaf = leaves?.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof CreatureView)
            return leaf.view;
    }

    get defaultParty() {
        return this.findParty(this.data.defaultParty);
    }
    findParty(party: string) {
        return this.data.parties.find((p) => p.name == party);
    }

    getBaseCreatureFromBestiary(name: string): SRDMonster {
        /** Check statblocks */
        try {
            if (
                this.canUseStatBlocks &&
                window.FantasyStatblocks.hasCreature(name)
            ) {
                return srd_from_statblocks(window.FantasyStatblocks.getCreatureFromBestiary(name));
            }
        } catch (e) { }
        return null;
    }
    getCreatureFromBestiary(name: string) {
        let creature = this.getBaseCreatureFromBestiary(name);
        if (creature) return Creature.from(creature);
    }
    getCreatureFromBestiaryByDefinition(
        creature: SRDMonster | HomebrewCreature
    ): Creature {
        return (
            this.getCreatureFromBestiary(creature.name) ??
            Creature.from(creature)
        );
    }

    async onload() {
        registerIcons();

        await this.loadSettings();

        this.setBuilderIcon();

        this.addSettingTab(new InitiativeTrackerSettings(this));

        this.registerView(
            INITIATIVE_TRACKER_VIEW,
            (leaf: WorkspaceLeaf) => new TrackerView(leaf, this)
        );
        this.registerView(
            PLAYER_VIEW_VIEW,
            (leaf: WorkspaceLeaf) => new PlayerView(leaf, this)
        );
        this.registerView(
            CREATURE_TRACKER_VIEW,
            (leaf: WorkspaceLeaf) => new CreatureView(leaf, this)
        );
        this.registerView(
            BUILDER_VIEW,
            (leaf: WorkspaceLeaf) => new BuilderView(leaf, this)
        );

        this.addCommands();
        this.addEvents();

        this.registerEditorSuggest(new EncounterSuggester(this));
        this.registerMarkdownCodeBlockProcessor("encounter", (src, el, ctx) => {
            if (
                this.canUseStatBlocks &&
                !window["FantasyStatblocks"].isResolved()
            ) {
                el.addClasses(["waiting-for-bestiary", "is-loading"]);
                const loading = el.createEl("p", {
                    text: "Waiting for Fantasy Statblocks Bestiary..."
                });
                const unload = window["FantasyStatblocks"].onResolved(() => {
                    el.removeClasses(["waiting-for-bestiary", "is-loading"]);
                    loading.detach();
                    const handler = new EncounterBlock(this, src, el);
                    ctx.addChild(handler);
                    unload();
                });
            } else {
                const handler = new EncounterBlock(this, src, el);
                ctx.addChild(handler);
            }
        });
        this.registerMarkdownCodeBlockProcessor(
            "encounter-table",
            (src, el, ctx) => {
                if (
                    this.canUseStatBlocks &&
                    !window["FantasyStatblocks"].isResolved()
                ) {
                    el.addClasses(["waiting-for-bestiary", "is-loading"]);
                    const loading = el.createEl("p", {
                        text: "Waiting for Fantasy Statblocks Bestiary..."
                    });
                    const unload = window["FantasyStatblocks"].onResolved(
                        () => {
                            el.removeClasses([
                                "waiting-for-bestiary",
                                "is-loading"
                            ]);
                            loading.detach();
                            const handler = new EncounterBlock(
                                this,
                                src,
                                el,
                                true
                            );
                            ctx.addChild(handler);
                            unload();
                        }
                    );
                } else {
                    const handler = new EncounterBlock(this, src, el, true);
                    ctx.addChild(handler);
                }
            }
        );

        this.registerMarkdownPostProcessor(async (el, ctx) => {
            if (!el || !el.firstElementChild) return;

            const codeEls = el.querySelectorAll<HTMLElement>("code");
            if (!codeEls || !codeEls.length) return;

            const codes = Array.from(codeEls).filter((code) =>
                /^encounter:\s/.test(code.innerText)
            );
            if (!codes.length) return;

            for (const code of codes) {
                const target = createSpan("initiative-tracker-encounter-line");

                code.replaceWith(target);

                const buildEncounter = async () => {
                    const definitions = code.innerText.replace(
                        `encounter:`,
                        ""
                    );

                    const creatures = parseYaml("[" + definitions.trim() + "]");
                    const parser = new EncounterParser(this);
                    const parsed = await parser.parse({ creatures });

                    if (
                        !parsed ||
                        !parsed.creatures ||
                        !parsed.creatures.size
                    ) {
                        target.setText("No creatures found.");
                        return;
                    }
                    new EncounterLine({
                        target,
                        props: {
                            ...parsed,
                            plugin: this
                        }
                    });
                };
                if (
                    this.canUseStatBlocks &&
                    !window["FantasyStatblocks"].isResolved()
                ) {
                    const loading = target.createSpan(
                        "waiting-for-bestiary inline"
                    );
                    const delay = Math.floor(200 * Math.random());

                    setIcon(
                        loading.createDiv({
                            cls: "icon",
                            attr: {
                                style: `animation-delay: ${delay}ms`
                            }
                        }),
                        "loader-2"
                    );
                    loading.createEl("em", {
                        text: "Loading Bestiary..."
                    });
                    const unload = window["FantasyStatblocks"].onResolved(
                        () => {
                            el.removeClasses([
                                "waiting-for-bestiary",
                                "inline"
                            ]);
                            loading.detach();
                            buildEncounter();
                            unload();
                        }
                    );
                } else {
                    buildEncounter();
                }
            }
        });

        this.app.workspace.onLayoutReady(async () => {
            this.addTrackerView();
        });

        console.log("Initiative Tracker v" + this.manifest.version + " loaded");
    }

    addCommands() {
        this.addCommand({
            id: "open-tracker",
            name: "Open Initiative Tracker",
            checkCallback: (checking) => {
                if (!this.view) {
                    if (!checking) {
                        this.addTrackerView();
                    }
                    return true;
                }
            }
        });
        this.addCommand({
            id: "open-builder",
            name: "Open Encounter Builder",
            checkCallback: (checking) => {
                if (!this.builder) {
                    if (!checking) {
                        this.addBuilderView();
                    }
                    return true;
                }
            }
        });

        this.addCommand({
            id: "toggle-encounter",
            name: "Toggle Encounter",
            checkCallback: (checking) => {
                const view = this.view;
                if (view) {
                    if (!checking) {
                        tracker.toggleState();
                    }
                    return true;
                }
            }
        });

        this.addCommand({
            id: "next-combatant",
            name: "Next Combatant",
            checkCallback: (checking) => {
                const view = this.view;
                if (view && tracker.getState()) {
                    if (!checking) {
                        tracker.goToNext();
                    }
                    return true;
                }
            }
        });

        this.addCommand({
            id: "prev-combatant",
            name: "Previous Combatant",
            checkCallback: (checking) => {
                const view = this.view;
                if (view && tracker.getState()) {
                    if (!checking) {
                        tracker.goToPrevious();
                    }
                    return true;
                }
            }
        });

        for (const encounter in this.data.encounters) {
            this.registerCommand(encounter);
        }
    }

    addEvents() {
        this.registerEvent(
            this.app.workspace.on(
                "initiative-tracker:should-save",
                async () => await this.saveSettings()
            )
        );
        this.registerEvent(
            app.workspace.on(
                "initiative-tracker:save-state",
                async (state: InitiativeViewState) => {
                    this.data.state = state;
                    await this.saveSettings();
                }
            )
        );
        this.registerEvent(
            this.app.workspace.on(
                "initiative-tracker:start-encounter",
                async (homebrews: HomebrewCreature[]) => {
                    try {
                        const creatures = homebrews.map((h) =>
                            Creature.from(h).toJSON()
                        );

                        const view = this.view;
                        if (!view) {
                            await this.addTrackerView();
                        }
                        if (view) {
                            tracker?.new(this, {
                                creatures,
                                state: false,
                                party: undefined,
                                name: null,
                                round: 1,
                                logFile: null,
                                roll: true
                            });
                            this.app.workspace.revealLeaf(view.leaf);
                        } else {
                            new Notice(
                                "Could not find the Initiative Tracker. Try reloading the note!"
                            );
                        }
                    } catch (e) {
                        new Notice(
                            "There was an issue launching the encounter.\n\n" +
                            (e as Error).message
                        );
                        console.error(e);
                        return;
                    }
                }
            )
        );
    }

    async onunload() {
        await this.saveSettings();
        this.app.workspace.trigger("initiative-tracker:unloaded");
        console.log("Initiative Tracker unloaded");
    }

    async addTrackerView() {
        if (
            this.app.workspace.getLeavesOfType(INITIATIVE_TRACKER_VIEW)?.length
        ) {
            return;
        }
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: INITIATIVE_TRACKER_VIEW
        });
    }
    get builder() {
        const leaves = this.app.workspace.getLeavesOfType(BUILDER_VIEW);
        const leaf = leaves.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof BuilderView)
            return leaf.view;
    }
    async addBuilderView() {
        if (this.app.workspace.getLeavesOfType(BUILDER_VIEW)?.length) {
            return;
        }
        await this.app.workspace.getLeaf(true).setViewState({
            type: BUILDER_VIEW
        });
        this.app.workspace.revealLeaf(this.builder.leaf);
    }

    async loadSettings() {
        const data = Object.assign(
            {},
            { ...DEFAULT_SETTINGS },
            await this.loadData()
        );

        this.data = data;
        if (this.data.statuses?.some((c) => !c.id)) {
            for (const condition of this.data.statuses) {
                condition.id =
                    condition.id ??
                    Conditions.find((c) => c.name == condition.name)?.id ??
                    getId();
            }
            await this.saveSettings();
        }

        this.data.version = this.manifest.version
            .split(".")
            .map((n) => Number(n));
    }

    async saveSettings() {
        await this.saveData(this.data);
        tracker.setData(this.data);
    }
    async openCombatant(creature: Creature) {
        if (!this.canUseStatBlocks) return;
        if (!this.combatant) {
            const leaf = this.app.workspace.getRightLeaf(true);
            await leaf.setViewState({
                type: CREATURE_TRACKER_VIEW
            });
        }

        await this.combatant.render(creature);
        this.app.workspace.revealLeaf(this.combatant.leaf);
    }
    private _builderIcon: HTMLElement;
    setBuilderIcon() {
        if (this.data.builder.sidebarIcon) {
            this._builderIcon = this.addRibbonIcon(
                BUILDER_VIEW,
                "Initiative Tracker Encounter Builder",
                () => {
                    this.addBuilderView();
                }
            );
        } else {
            this._builderIcon?.detach();
        }
    }
}
