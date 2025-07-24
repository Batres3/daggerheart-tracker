import { RpgSystem } from "./rpgSystem";
import type { GenericCreature, DifficultyLevel, DifficultyThreshold } from ".";
import InitiativeTracker from "src/main";

function level_to_tier(level: number): number {
    if (level == 1) return 1;
    else if (level <= 4) return 2;
    else if (level <= 7) return 3;
    else return 4;
}

function average_tier(levels: number[]): number {
    let tiers = levels.map(level_to_tier);
    return Math.round(tiers.reduce((a, b) => a + b, 0) / tiers.length);
}

export class DaggerheartSystem extends RpgSystem {
    override systemDifficulties: [string, string, ...string[]] = [
        "Easy",
        "Balanced",
        "Hard"
    ];
    override valueUnit: string = "BP";

    constructor(plugin: InitiativeTracker) {
        super();
        this.displayName = "Daggerheart";
    }

    getCreatureDifficulty(creature: GenericCreature, partyLevels: number[]): number {
        if (creature.type == "Minion") return 1 / partyLevels.length;
        if (creature.type == "Social" || creature.type == "Support") return 1;
        if (creature.type.startsWith("Horde") || creature.type == "Ranged"
            || creature.type == "Skulk" || creature.type == "Standard") return 2;
        if (creature.type == "Leader") return 3;
        if (creature.type == "Bruiser") return 4;
        if (creature.type == "Solo") return 5;
        return 0;
    }

    getAdditionalCreatureDifficultyStats(
        creature: GenericCreature,
        playerLevels: number[]
    ): string[] {
        let tier = average_tier(playerLevels);
        if (creature.tier > tier) return ["Overleveled"];
        if (creature.tier < tier) return ["Underleveled"];
        return [];
    }

    getEncounterDifficulty(
        creatures: Map<GenericCreature, number>,
        playerLevels: number[]
    ): DifficultyLevel {
        let budget = 3 * playerLevels.length + 2;
        let player_tier = average_tier(playerLevels);
        let cost = Array.from(creatures.entries())
            .reduce((sum, [creature, number]) =>
                this.getCreatureDifficulty(creature, playerLevels) * number + sum
                , 0)

        let monsters = Array.from(creatures.keys());
        let num_solos = monsters.filter(c => c.type == "Solo").length >= 2 ? -2 : 0;
        let lower_tier = monsters.filter(c => c.tier < player_tier).length >= 1 ? 1 : 0;
        let harder_monsters = monsters.filter(c => c.type.startsWith("Horde") || c.type == "Bruiser" || c.type == "Leader" || c.type == "Solo").length == 0 ? 1 : 0;

        let remaining = budget - cost + num_solos + lower_tier + harder_monsters;

        let displayName = "";
        if (remaining > 0) displayName = "Easy";
        else if (remaining < 0) displayName = "Hard";
        else displayName == "Balanced";

        return {
            displayName: displayName,
            cssClass: displayName.toLowerCase(),
            value: remaining,
            title: "Battle Points",
            summary: `Encounter is ${displayName}
${remaining} Battle Points remaining`,
            intermediateValues: []
        };
    }

    getDifficultyThresholds(playerLevels: number[]): DifficultyThreshold[] {
        return [
            {
                displayName: "Hard",
                minValue: -1000,
            },
            {
                displayName: "Balanced",
                minValue: 0,
            },
            {
                displayName: "Easy",
                minValue: 1,
            }
        ]
    }
}
