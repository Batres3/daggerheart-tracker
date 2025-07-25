import type { Party } from "src/settings/settings.types";
import { DEFAULT_UNDEFINED } from "../constants";
import type { GenericCreature, DifficultyLevel, DifficultyThreshold } from "./index";

export abstract class RpgSystem {
    abstract systemDifficulties: [string, string, ...string[]];

    /** The display name of the RPG system, used in the UI. */
    displayName: string = DEFAULT_UNDEFINED;

    /** The unit that difficulty values are expressed in, eg "XP". Used for formatting values. */
    valueUnit: string = "XP";

    /** Returns information related to the difficulty of a creature relative to the given players. */
    getCreatureDifficulty(
        creature: GenericCreature,
        party: Party
    ): number {
        return 0;
    }

    /** Returns additional information related to the difficulty of a creature relative to the given players. */
    getAdditionalCreatureDifficultyStats(
        creature: GenericCreature,
        party: Party
    ): string[] {
        return [];
    }

    /** Returns information related to the difficulty of the encounter relative to the given players. */
    getEncounterDifficulty(
        creatures: Map<GenericCreature, number>,
        party: Party
    ): DifficultyLevel {
        return {
            displayName: DEFAULT_UNDEFINED,
            cssClass: "",
            value: 0,
            title: "Total XP",
            summary: DEFAULT_UNDEFINED,
            intermediateValues: []
        };
    }

    /** Returns an array of difficulty thresholds in ascending order. */
    getDifficultyThresholds(party: Party): DifficultyThreshold[] {
        return [];
    }

    /** Returns the given difficulty value formatted with system-appropriate units, eg "800 XP". */
    formatDifficultyValue(value: number, withUnits?: boolean): string {
        if (isNaN(value)) return DEFAULT_UNDEFINED;
        return withUnits
            ? `${value.toLocaleString()} ${this.valueUnit}`
            : value.toLocaleString();
    }

    /**
     * Returns an array of any additional budgets which should be displayed,
     * but not taken into account when calculating the difficulty tier.
     */
    getAdditionalDifficultyBudgets(party: Party): DifficultyThreshold[] {
        return []
    }
}
