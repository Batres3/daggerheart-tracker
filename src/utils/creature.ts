import type { Condition } from "src/types/creatures";
import { type HomebrewCreature, type SRDMonster, type CreatureState, Resource, Thresholds } from "src/types/creatures";
import { Conditions } from ".";
import type { CreatureStats } from "src/encounter/index"
import { DEFAULT_UNDEFINED } from "./constants";
import type InitiativeTracker from "src/main";

export function getId() {
    return "ID_xyxyxyxyxyxy".replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export class Creature {
    name: string;
    display: string;
    spotlight: boolean;
    thresholds: Thresholds;
    dc: Resource;
    hp: Resource;
    stress: Resource;
    atk: number;
    note: string;
    enabled: boolean = true;
    hidden: boolean = false;
    type: string;
    tier: number;
    status: Set<Condition> = new Set();
    marker: string;
    source: string | string[];
    id: string;
    viewing: boolean = false;
    number = 0;
    friendly: boolean = false;
    statblock_link: string;
    path: string;
    manual_order: number;
    takeDamage(damage: number) {

    }
    addCondition(condition: Condition) {
        if (![...this.status].find(cond => cond.name === condition.name && cond.amount === condition.amount)) {
            this.status.add(condition);
        }
    }
    removeCondition(condition: Condition) {
        this.status = new Set(
            [...this.status].filter((s) => s.id != condition.id)
        );
    }
    constructor(public creature: HomebrewCreature) {
        this.name = creature.name;
        this.display = creature.display;
        this.dc = new Resource(creature.dc);
        this.hp = new Resource(creature.hp);
        this.stress = new Resource(creature.stress);
        this.thresholds = creature.thresholds ?? new Thresholds(0, 0);
        this.atk = creature.atk;
        this.note = creature.note;
        this.tier = creature.tier;
        this.type = creature.type ?? "";
        this.marker = creature.marker;
        this.source = creature.source;
        this.friendly = creature.friendly ?? this.friendly;
        this.spotlight = creature.spotlight;
        this.hidden = creature.hidden ?? false;
        this.note = creature.note;
        this.path = creature.path;
        this.id = creature.id ?? getId();
        this.statblock_link = creature.statblock_link ?? undefined;
    }
    getName() {
        let name = [this.display ?? this.name];
        if (this.number > 0) {
            name.push(`${this.number}`);
        }
        return name.join(" ");
    }
    getStatblockLink(): string {
        if ("statblock_link" in this) {
            const value = this.statblock_link;
            return value.startsWith("#")
                ? `[${this.name}](${this.note}${value})`
                : value;
        }
    }

    *[Symbol.iterator]() {
        yield this.name;
        yield this.atk;
        yield this.hp;
        yield this.stress;
        yield this.dc;
        yield this.note;
        yield this.path;
        yield this.id;
        yield this.marker;
        yield this.hidden;
    }

    static new(creature: Creature) {
        return new Creature(
            {
                ...creature,
                id: getId(),
                hp: creature.hp ? creature.hp.max : 0,
                stress: creature.stress ? creature.stress.max : 0,
                dc: creature.dc ? creature.dc.max : 0,
            },
        );
    }

    static from(creature: HomebrewCreature | SRDMonster) {
        return new Creature({
            ...creature
        });
    }

    update(creature: HomebrewCreature) {
        this.name = creature.name;

        this.hp.set_max(creature.hp);
        this.stress.set_max(creature.stress);
        this.dc = new Resource(creature.dc);

        this.note = creature.note;
        this.tier = creature.tier;
        this.type = creature.type;
        this.statblock_link = creature.statblock_link;

        this.marker = creature.marker;
        this.source = creature.source;
    }

    toProperties() {
        return { ...this };
    }

    toJSON(): CreatureState {
        return {
            name: this.name,
            display: this.display,
            spotlight: this.spotlight,
            major: this.thresholds.major,
            severe: this.thresholds.severe,
            dc: this.dc.max,
            current_dc: this.dc.current,
            hp: this.hp.current,
            max_hp: this.hp.max,
            stress: this.stress.current,
            max_stress: this.stress.max,
            tier: this.tier,
            type: this.type,
            note: this.note,
            path: this.path,
            id: this.id,
            marker: this.marker,
            status: Array.from(this.status).map((c) => c.name),
            enabled: this.enabled,
            hidden: this.hidden,
            friendly: this.friendly,
            statblock_link: this.statblock_link,
        };
    }

    static fromJSON(state: CreatureState, plugin: InitiativeTracker) {
        let creature = new Creature(state);
        creature.enabled = state.enabled;

        creature.hp = new Resource(state.max_hp, state.hp);
        creature.stress = new Resource(state.max_stress, state.stress);
        creature.dc = new Resource(state.dc, state.current_dc);
        creature.thresholds = new Thresholds(state.major, state.severe);
        creature.type = state.type;
        creature.tier = state.tier;

        let statuses: Condition[] = [];
        for (const status of state.status) {
            const existing = Conditions.find(({ name }) => status == name);
            if (existing) {
                statuses.push(existing);
            } else {
                statuses.push({
                    name: status,
                    description: null,
                    id: getId()
                });
            }
        }
        creature.status = new Set(statuses);
        creature.spotlight = state.spotlight;
        return creature;
    }

    get_stats(): CreatureStats {
        return {
            name: this.name,
            display: this.display,
            dc: this.dc.max,
            hp: this.hp.max,
            stress: this.stress.max,
            atk: this.atk,
            hidden: this.hidden,
            friendly: this.friendly,
        };
    }
}
