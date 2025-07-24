import type { Creature } from "../creature";
import type { SRDMonster } from "src/types/creatures";
import type InitiativeTracker from "../../main";
import { DaggerheartSystem } from "./daggerheart";
import { RpgSystem } from "./rpgSystem";
import { DEFAULT_UNDEFINED } from "../constants";

export type GenericCreature = Creature | SRDMonster;

export type DifficultyLevel = {
    /** Name of the difficulty level, eg "trivial". Used to display the difficulty level in encounters. */
    displayName: string,
    /** The CSS class to apply when formatting the display name. Should map to DnD 5e thresholds (low, easy, medium, hard, extreme) + trivial
     *  so systems do not have have their own custom styling.
     */
    cssClass: string,
    /** Associated value for the difficulty level. This should be the value used to calculate the difficulty level. */
    value: number,
    /** Title to display for the difficulty value, eg "Total XP". Used to label the difficulty value. */
    title: string,
    /**
     * A summary of the difficulty of an enounter, including the thresholds involved
     * and any intermediate calculation values.
     *
     * @example
     * ```
     * Encounter is Deadly
     * Total XP: 400
     * Adjusted XP: 600 (x1.5)
     *
     * Threshold
     * Easy: 100
     * Medium: 200
     * Hard: 300
     * Deadly: 400
     * ```
     */
    summary: string,
    /** Any intermediate values involved in the calculation that should be displayed */
    intermediateValues: { label: string, value: number }[]
};

export type DifficultyThreshold = {
    /** The display name for the budget item, eg "Trivial" */
    displayName: string,
    /** The minimum value required to meet this difficulty threshold. */
    minValue: number
}

export type IntermediateValues = { label: string, value: number }[]

export enum RpgSystemSetting {
    Daggerheart = "Daggerheart",
}


class UndefinedRpgSystem extends RpgSystem {
    systemDifficulties: [string, string, ...string[]] = [DEFAULT_UNDEFINED, DEFAULT_UNDEFINED];
}

/**
 * Returns the RpgSystem associated with the settings value. If not provided,
 * use the value in the plugin settings.
 */
export function getRpgSystem(plugin: InitiativeTracker, settingId?: string): RpgSystem {
    return new DaggerheartSystem(plugin);
}
