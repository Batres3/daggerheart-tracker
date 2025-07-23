import type { Monster } from "@javalent/fantasy-statblocks";
export class Thresholds {
    major: number;
    severe: number;
    constructor(major: number, severe: number) {
        this.major = major;
        this.severe = severe;
    }
    compare(damage: number, massive: boolean = false) {
        if (damage < this.major) {
            return 1;
        } else if (damage < this.severe) {
            return 2;
        } else {
            if (massive && damage >= 2 * this.severe) {
                return 4;
            }
            return 3;
        }
    }
}

export class Resource {
    max: number;
    current: number;
    constructor(max: number, current?: number) {
        this.max = max;
        this.current = current ?? max;
    }
    set(value?: number) {
        if (!value) return;
        this.max = this.current = value;
    }
    set_max(max: number) {
        this.max = max;
        if (this.current > this.max) this.current = this.max;
    }
    reset() {
        this.current = this.max;
    }
    percent() {
        return this.current / this.max * 100;
    }
}

export interface CreatureState extends HomebrewCreature {
    status: string[];
    major: number;
    severe: number;
    dc: number;
    current_dc: number;
    hp: number;
    max_hp: number;
    stress: number;
    max_stress: number;
    spotlight: boolean;
    static: boolean;
    enabled: boolean;
    player: boolean;
}

export interface SRDMonster {
    name: string;
    thresholds: Thresholds;
    dc: number;
    hp: number;
    stress: number;
    atk: number
    monster?: string;
    friendly?: boolean;
    hidden?: boolean;
    bestiary?: boolean;
    player?: boolean;

    [key: string]: any;
}

export function srd_from_statblocks(item: Monster): SRDMonster {
    let thresholds = null;
    if (item.thresholds == "None") {
        thresholds = new Thresholds(0, 0);
    } else {
        const [major, severe] = item.thresholds.split("/");
        thresholds = new Thresholds(Number(major), Number(severe));
    }
    return {
        name: item.name,
        thresholds: thresholds,
        dc: item.difficulty as number,
        hp: item.hp as number,
        stress: item.stress as number,
        atk: Number(item.atk),
        monster: item.monster as string ?? "",
        friendly: item.friendly as boolean ?? false,
        hidden: item.hidden as boolean ?? false,
        bestiary: item.bestiary as boolean ?? true,
        player: item.player as boolean ?? false,
    }
}

export interface HomebrewCreature {
    name?: string;
    display?: string;
    thresholds?: Thresholds;
    dc?: number;
    hp?: number;
    stress?: number;
    atk?: number
    source?: string | string[];
    note?: string;
    path?: string;
    level?: number;
    player?: boolean;
    marker?: string;
    id?: string;
    hidden?: boolean;
    friendly?: boolean;
    spotlight?: boolean;
    static?: boolean;
    statblock_link?: string;
}

export type Condition = {
    name: string;
    description: string;
    id: string;
    resetOnRound?: boolean;
    hasAmount?: boolean;
    startingAmount?: number;
    amount?: number;
} & (
        | {
            hasAmount: true;
            startingAmount: number;
            amount: number;
        }
        | {}
    );
