import type { CreatureState, HomebrewCreature } from "src/types/creatures";

export interface InitiativeViewState {
    creatures: CreatureState[];
    state: boolean;
    party: string;
    name: string;
    round: number;
    logFile: string;
    newLog?: boolean;
    roll?: boolean;
    rollHP?: boolean;
    timestamp?: number;
}

