import { MarkdownRenderChild, Notice, parseYaml } from "obsidian";
import type InitiativeTracker from "../main";
import { Creature } from "../utils/creature";

import EncounterUI from "./ui/Encounter.svelte";
import EncounterTable from "./ui/EncounterTable.svelte";
import type { Party } from "src/settings/settings.types";

type RawCreatureArray = string | Array<string | { [key: number]: string }>;
type RawCreature = string | { [key: number]: string };
type RawPlayers = boolean | "none" | string[];
export interface EncounterParameters {
    name?: string;
    party?: string;
    hide?: "creatures" | string[];
    creatures?: RawCreatureArray;
}
export interface CreatureStats {
    name: string;
    dc: number;
    hp: number;
    stress: number;
    atk: number;
    display?: string;
    hidden: boolean;
    friendly?: boolean;
    static?: boolean;
}

export const equivalent = (
    creature: Creature,
    existing: CreatureStats
) => {
    return (
        creature.name == existing.name &&
        creature.display == existing.display &&
        creature.dc.max == existing.dc &&
        creature.hp.max == existing.hp &&
        creature.stress.max == existing.stress &&
        creature.atk == existing.atk &&
        creature.hidden == existing.hidden &&
        creature.friendly == existing.friendly &&
        creature.static == existing.static
    );
};

export interface ParsedParams {
    name: string;
    party: Party;
    hide: string[];
    creatures: Map<Creature, string | number>;
}

export class EncounterParser {
    constructor(public plugin: InitiativeTracker) { }
    async parse(params: EncounterParameters): Promise<ParsedParams> {
        const name = params.name;
        const party = this.plugin.data.parties.find(
            (p) => p.name == params.party ?? this.plugin.data.defaultParty
        );
        const hide = this.parseHide(params);
        const rawMonsters = params.creatures ?? [];

        let creatures = await this.parseRawCreatures(rawMonsters);

        return {
            name,
            party,
            hide,
            creatures,
        };
    }
    parseHide(params: EncounterParameters): string[] {
        if (!("hide" in (params ?? {}))) return [];
        if (typeof params.hide == "string")
            return ["creatures"].filter((v) => params.hide == v);
        if (Array.isArray(params.hide))
            return ["creatures"].filter((v) =>
                params.hide.includes(v)
            );

        return [];
    }

    async parseRawCreatures(rawMonsters: RawCreatureArray) {
        const creatureMap: Map<Creature, number | string> = new Map();
        if (rawMonsters && Array.isArray(rawMonsters)) {
            for (const raw of rawMonsters) {
                const { creature, number = 1 } =
                    this.parseRawCreature(raw) ?? {};
                if (!creature) continue;

                const stats: CreatureStats = creature.get_stats();
                const existing = [...creatureMap].find(([c]) =>
                    equivalent(c, stats)
                );
                if (!existing) {
                    creatureMap.set(creature, number);
                } else {
                    let amount;
                    if (!isNaN(Number(number)) && !isNaN(Number(existing[1]))) {
                        amount =
                            (Number(number) as number) +
                            (existing[1] as number);
                    } else {
                        amount = `${number} + ${existing[1]}`;
                    }

                    creatureMap.set(existing[0], amount);
                }
            }
        }
        return creatureMap;
    }
    parseRawCreature(raw: RawCreature) {
        if (!raw) return {};
        let monster: string | string[] | Record<string, any>,
            number: string | number = 1;

        if (typeof raw == "string") {
            const match = raw.match(/(\d+)?:?\s?(.+)/) ?? [];
            number = isNaN(Number(match[1] ?? null))
                ? number
                : Number(match[1]);
            monster = match[2];
        } else if (Array.isArray(raw)) {
            monster = raw;
        } else if (typeof raw == "object") {
            let entries = Object.entries(raw).flat();
            number = entries[0];
            monster = entries[1];
        }

        if (!monster) return {};

        if (
            typeof number == "string" &&
            !this.plugin.canUseDiceRoller &&
            /\d+d\d+/.test(number)
        ) {
            number = 1;
        }
        if (!isNaN(Number(number))) number = Number(number);
        if (number != 0 && !number) number = 1;
        if (typeof number == "number" && number < 1) number = 0;
        let stats: CreatureStats = {
            name: "",
            dc: 0,
            hp: 0,
            stress: 0,
            atk: 0,
            hidden: false,
        };
        if (typeof monster == "string") {
            if (monster.match(/,\s+hidden/)) {
                stats.hidden = true;
                monster = monster.replace(/,\s*hidden/, "");
            }
            if (
                monster.match(/,\s+friend(?:ly)?/) ||
                monster.match(/,\s+ally/)
            ) {
                stats.friendly = true;
                monster = monster
                    .replace(/,\s*friend(?:ly)?/, "")
                    .replace(/,\s*ally/, "");
            }
            stats.name = monster.split(/,\s?/)[0];
            [stats.dc, stats.hp, stats.stress] = monster
                .split(/,\s?/)
                .slice(1)
                .map((v) => (isNaN(Number(v)) ? null : Number(v)));
        } else if (Array.isArray(monster)) {
            if (typeof monster[0] == "string") {
                //Hobgoblin, Jim
                stats.name = monster[0];
                stats.display = monster[1];
            } else if (Array.isArray(monster[0])) {
                //[Hobgoblin, Jim]
                stats.name = monster[0][0];
                stats.display = monster[0][1];
            }

            stats.hidden = monster.slice(1).find((v) => v == "hidden") != undefined;

            stats.friendly =
                monster
                    .slice(1)
                    .find(
                        (v) => v == "friend" || v == "friendly" || v == "ally"
                    ) != undefined;

            [stats.dc, stats.hp, stats.stress] = monster
                .slice(1)
                .filter(
                    (v) =>
                        v != "hidden" &&
                        v != "friend" &&
                        v != "friendly" &&
                        v != "ally"
                )
                .map((v) => (isNaN(Number(v)) ? null : Number(v)));
        } else if (typeof monster == "object") {
            ({ creature: stats.name, name: stats.display, dc: stats.dc, hp: stats.hp, stress: stats.stress } = monster);
            stats.hidden = monster.hidden || false;
            stats.friendly = monster.friend || monster.ally || false;
        }

        if (!stats.name || typeof stats.name != "string") return {};
        let existing = this.plugin.getCreatureFromBestiary(stats.name);
        let creature = existing ?? new Creature({ name: stats.name });

        creature.display = stats.display;
        creature.dc.set(stats.dc);
        creature.hp.set(stats.hp);
        creature.stress.set(stats.stress);
        creature.hidden = stats.hidden ?? creature.hidden;
        creature.friendly = stats.friendly ?? creature.friendly;

        return { creature, number };
    }
}

class EncounterComponent {
    instance: EncounterUI;
    constructor(
        public params: ParsedParams,
        public encounterEl: HTMLElement,
        public plugin: InitiativeTracker
    ) {
        this.display();
    }
    async display() {
        this.instance = new EncounterUI({
            target: this.encounterEl,
            props: {
                plugin: this.plugin,
                name: this.params.name,
                party: this.params.party,
                creatures: this.params.creatures,
                hide: this.params.hide,
            }
        });
    }
}

export class EncounterBlock extends MarkdownRenderChild {
    parser: EncounterParser;
    constructor(
        public plugin: InitiativeTracker,
        public src: string,
        public containerEl: HTMLElement,
        public table = false
    ) {
        super(containerEl);
        this.parser = new EncounterParser(this.plugin);
        this.init();
    }
    init(): void {
        if (this.table) {
            this.postprocessTable();
        } else {
            this.postprocess();
        }
    }
    async postprocess() {
        const encounters = this.src.split("---") ?? [];
        const containerEl = this.containerEl.createDiv("encounter-container");
        const empty = containerEl.createSpan({
            text: "No encounters created. Please check your syntax and try again."
        });

        for (let encounter of encounters) {
            if (!encounter?.trim().length) continue;
            try {
                const params: EncounterParameters = parseYaml(encounter);
                new EncounterComponent(
                    await this.parser.parse(params),
                    containerEl.createDiv("encounter-instance"),
                    this.plugin
                );
                empty.detach();
            } catch (e) {
                console.error(e);
                new Notice(
                    "Initiative Tracker: here was an issue parsing: \n\n" +
                    encounter
                );
            }
        }
        this.plugin.register(() => {
            this.containerEl.empty();
            this.containerEl.createEl("pre").createEl("code", {
                text: `\`\`\`encounter\n${this.src}\`\`\``
            });
        });
    }
    async postprocessTable() {
        const encounterSource = this.src.split("---") ?? [];
        const containerEl = this.containerEl.createDiv("encounter-container");
        const empty = containerEl.createSpan({
            text: "No encounters created. Please check your syntax and try again."
        });

        const encounters: ParsedParams[] = [];

        for (let encounter of encounterSource) {
            if (!encounter?.trim().length) continue;
            try {
                const params: EncounterParameters = parseYaml(encounter);
                encounters.push(await this.parser.parse(params));
            } catch (e) {
                console.error(e);
                new Notice(
                    "Initiative Tracker: here was an issue parsing: \n\n" +
                    encounter
                );
            }
        }
        if (encounters.length) {
            empty.detach();
            new EncounterTable({
                target: this.containerEl,
                props: {
                    encounters,
                    plugin: this.plugin
                }
            });
        }
        this.plugin.register(() => {
            this.containerEl.empty();
            this.containerEl.createEl("pre").createEl("code", {
                text: `\`\`\`encounter-table\n${this.src}\`\`\``
            });
        });
    }
}
