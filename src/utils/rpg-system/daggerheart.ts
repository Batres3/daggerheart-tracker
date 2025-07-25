import { RpgSystem } from "./rpgSystem";
import type { GenericCreature, DifficultyLevel, DifficultyThreshold } from ".";
import InitiativeTracker from "src/main";
import type { Party } from "src/settings/settings.types";

function level_to_tier(level: number): number {
    if (level == 1) return 1;
    else if (level <= 4) return 2;
    else if (level <= 7) return 3;
    else return 4;
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

    getCreatureDifficulty(creature: GenericCreature, party: Party): number {
        if (creature.type == "Minion") return 1 / party.players;
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
        party: Party
    ): string[] {
        if (!party) {
            party = { name: "", players: 0, level: 0 };
        }
        let tier = level_to_tier(party.level);
        if (creature.tier > tier) return ["Overleveled"];
        if (creature.tier < tier) return ["Underleveled"];
        return [];
    }

    getEncounterDifficulty(
        creatures: Map<GenericCreature, number>,
        party: Party
    ): DifficultyLevel {
        if (!party) {
            party = { name: "", players: 0, level: 0 };
        }
        let budget = 3 * party.players + 2;
        let player_tier = level_to_tier(party.level);
        let cost = Array.from(creatures.entries())
            .reduce((sum, [creature, number]) =>
                this.getCreatureDifficulty(creature, party) * number + sum
                , 0)

        let monsters = Array.from(creatures.keys());
        let num_solos = monsters.filter(c => c.type == "Solo").length >= 2 ? -2 : 0;
        let lower_tier = monsters.filter(c => c.tier < player_tier).length >= 1 ? 1 : 0;
        let harder_monsters = monsters.filter(c => c.type.startsWith("Horde") || c.type == "Bruiser" || c.type == "Leader" || c.type == "Solo").length == 0 ? 1 : 0;

        let remaining = budget - cost + num_solos + lower_tier + harder_monsters;

        let displayName = "";
        if (remaining > 0) displayName = "Easy";
        else if (remaining < 0) displayName = "Hard";
        else displayName = "Balanced";

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

    getDifficultyThresholds(party: Party): DifficultyThreshold[] {
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
