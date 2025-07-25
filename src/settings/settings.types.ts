import type { InitiativeViewState } from "src/tracker/view.types";
import type { Condition } from "src/types/creatures";
import type { HomebrewCreature } from "src/types/creatures";
import type { BuilderState } from "src/builder/builder.types";

export interface InitiativeTrackerData {
    beginnerTips: boolean;
    displayDifficulty: boolean;
    preferStatblockLink: boolean;
    statuses: Condition[];
    openState: {
        battle: boolean;
        party: boolean;
        status: boolean;
        plugin: boolean;
        player: boolean;
        builder: boolean;
    };
    parties: Party[];
    defaultParty: string;

    rpgSystem: string;
    canUseDiceRoll: boolean;
    initiative: string;
    modifier: string;
    sync: boolean;
    playerMarker: string;
    monsterMarker: string;
    state: InitiativeViewState;
    unconsciousId: string;
    encounters: { [key: string]: InitiativeViewState };
    massiveDamage: boolean;
    clamp: boolean;
    hpOverflow: string;
    autoStatus: boolean;
    warnedAboutImports: boolean;
    logging: boolean;
    logFolder: string;
    useLegacy: boolean;
    diplayPlayerHPValues: boolean;
    builder: BuilderState;
    descending: boolean;
    version: number[];
}
export interface InputValidate {
    input: HTMLInputElement;
    validate: (i: HTMLInputElement) => boolean;
}
export interface Party {
    name: string;
    players: number;
    level: number;
}
