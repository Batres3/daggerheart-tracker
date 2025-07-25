import { Creature, getId } from "src/utils/creature";
import type InitiativeTracker from "../../main";
import {
    derived,
    get,
    type Updater,
    type Writable,
    writable
} from "svelte/store";
import { equivalent } from "../../encounter";
import { Events, Platform, TFile } from "obsidian";
import type { UpdateLogMessage } from "src/logger/logger.types";
import type { Condition } from "src/types/creatures";
import type { InitiativeTrackerData, Party } from "src/settings/settings.types";
import type { InitiativeViewState } from "../view.types";
import {
    OVERFLOW_TYPE,
    getRpgSystem
} from "src/utils";
import type Logger from "../../logger/logger";
import type {
    DifficultyLevel,
    DifficultyThreshold
} from "src/utils/rpg-system";
import type { StackRoller } from "@javalent/dice-roller";

type HPUpdate = {
    saved: boolean;
    resist: boolean;
    customMod: "2" | "1";
};
type CreatureUpdate = {
    damage?: number;
    stress?: number;
    dc?: number | string;
    name?: string;
    marker?: string;
    status?: Condition[];
    remove_status?: Condition[];
    hidden?: boolean;
    enabled?: boolean;
};
type CreatureUpdates = { creature: Creature, change: CreatureUpdate };
const modifier = Platform.isMacOS ? "Meta" : "Control";
function createTracker() {
    const creatures = writable<Creature[]>([]);
    const updating = writable<Map<Creature, HPUpdate>>(new Map());
    const updateTarget = writable<"ac" | "hp">();
    const { subscribe, set, update } = creatures;

    const $logFile = writable<TFile | null>();

    const $party = writable<string | null>(null);

    let _logger: Logger;

    const $round = writable<number>(1);
    const $state = writable<boolean>(false);
    const setState = (state: boolean) => {
        $state.set(state);
        if (state) {
            if (!_logger?.logging) {
                _logger
                    ?.new({
                        name: get($name)!,
                        creatures: current_order,
                        round: get($round)
                    })
                    .then(() => {
                        $logFile.set(_logger.getFile());
                    });
            } else {
                _logger?.log(`Combat re-started`);
            }
        } else {
            _logger?.log("Combat stopped");
        }
        updateAndSave((creatures) => {
            if (creatures.length && !creatures.find((c) => c.spotlight)) {
                current_order[0].spotlight = true;
            }
            return creatures;
        });
    };
    const $name = writable<string | null>();

    const data = writable<InitiativeTrackerData>();
    const descending = derived(data, (data) => {
        return data.descending;
    });
    let _settings: InitiativeTrackerData | null;

    let current_order: Creature[] = [];
    const ordered = derived([creatures, data], ([values, data]) => {
        const sort = [...values];
        sort.sort((a, b) => {
            /* Order creatures in this order:
               1. By manual order (drag & drop) */
            if (
                a.manual_order !== null && a.manual_order !== undefined &&
                b.manual_order !== null && b.manual_order !== undefined &&
                a.manual_order !== b.manual_order
            ) {
                const aOrder = a.manual_order || 0;
                const bOrder = b.manual_order || 0;
                return aOrder - bOrder;
            }
        });
        current_order = sort;
        return sort;
    });

    const updateCreature = (creature: Creature, change: CreatureUpdate) => {
        if (change.name) {
            creature.name = change.name;
            creature.number = 0;
        }
        if (change.stress) {
            creature.stress.current = Number(creature.stress.current) + Number(change.stress);
        }
        if (change.damage) {
            if (change.damage < 0) {
                change.damage = -1 * creature.thresholds.compare(Math.abs(Number(change.damage)), _settings.massiveDamage)
            }
            creature.hp.current = Number(creature.hp.current) + Number(change.damage);
        }
        if (_settings.hpOverflow == OVERFLOW_TYPE.ignore && creature.hp.current > creature.hp.max) {
            creature.hp.current = creature.hp.max;
        }
        if (_settings.clamp) {
            if (creature.stress.current < 0) {
                creature.hp.current = Number(creature.hp.current) + Number(creature.stress.current);
                creature.stress.current = 0;
            }
            if (creature.hp.current < 0) creature.hp.current = 0;
        }
        if (_settings.autoStatus) {
            if (creature.stress.current <= 0) {
                const unc = _settings.statuses.find(
                    (s) => s.id == "Vulnerable"
                );
                if (unc) creature.addCondition(unc);
            }
            if (creature.hp.current <= 0) {
                const unc = _settings.statuses.find(
                    (s) => s.id == _settings.unconsciousId
                );
                if (unc) creature.addCondition(unc);
            }
        }
        if (change.dc) {
            creature.dc.current = Number(change.dc);
        }
        if (change.marker) {
            creature.marker = change.marker;
        }
        if (change.status?.length) {
            for (const status of change.status) {
                creature.addCondition(status);
            }
        }
        if (change.remove_status?.length) {
            for (const status of change.remove_status) {
                creature.removeCondition(status);
            }
        }
        if (change.hidden) {
            creature.hidden = change.hidden!;
            _logger.log(
                `${creature.getName()} ${creature.hidden ? "hidden" : "revealed"
                }`
            );
        }
        if (change.enabled) {
            creature.enabled = change.enabled!;
            _logger.log(
                `${creature.getName()} ${creature.enabled ? "enabled" : "disabled"
                }`
            );
        }

    }

    const updateCreatures = (...updates: CreatureUpdates[]) =>
        updateAndSave((creatures) => {
            for (const { creature, change } of updates) {
                updateCreature(creature, change)
                if (!creatures.includes(creature)) {
                    creatures.push(creature);
                }
            }
            return creatures;
        });

    const getEncounterState = (): InitiativeViewState => {
        return {
            creatures: get(creatures).map((c) => c.toJSON()),
            party: get($party),
            state: get($state),
            name: get($name)!,
            round: get($round),
            logFile: _logger?.getLogFile() ?? null,
        };
    };

    const trySave = () => {
        app.workspace.trigger(
            "initiative-tracker:save-state",
            getEncounterState()
        );
    };

    function updateAndSave(updater: Updater<Creature[]>): void {
        update(updater);
        trySave();
    }

    const setNumbers = (list: Creature[]) => {
        for (let i = 0; i < list.length; i++) {
            const creature = list[i];
            if (creature.number > 0) continue;
            if (list.filter((c) => c.name == creature.name).length == 1) {
                continue;
            }
            const prior = list
                .filter((c) =>
                    c.display
                        ? c.display == creature.display
                        : c.name == creature.name
                )
                .map((c) => c.number);

            creature.number = prior?.length ? Math.max(...prior) + 1 : 1;
        }
    };

    return {
        subscribe,
        set,

        data,
        setData: (settings: InitiativeTrackerData) => {
            data.set(settings);
            _settings = settings;
        },

        getLogger: () => _logger,

        setLogger: (logger: Logger) => {
            _logger = logger;
        },

        updating,
        updateTarget,
        updateCreatures,
        updateCreatureByName: (name: string, change: CreatureUpdate) =>
            updateAndSave((creatures) => {
                updateCreature(creatures.find((c) => c.name == name), change);
                return creatures;
            }),

        setUpdate: (creature: Creature, evt: MouseEvent) =>
            updating.update((creatures) => {
                if (creatures.has(creature)) {
                    creatures.delete(creature);
                } else {
                    creatures.set(creature, {
                        saved: evt.getModifierState("Shift"),
                        resist: evt.getModifierState(modifier),
                        customMod: evt.getModifierState("Alt") ? "2" : "1"
                    });
                }
                return creatures;
            }),
        doUpdate: (
            damage: string,
            dc: string,
            stress: string,
            statuses: Condition[],
            removeStatuses: Condition[] = []
        ) =>
            updating.update((updatingCreatures) => {
                const messages: UpdateLogMessage[] = [];
                const updates: CreatureUpdates[] = [];

                updatingCreatures.forEach((entry, creature) => {
                    const change: CreatureUpdate = {};
                    const modifier =
                        (entry.saved ? 0.5 : 1) *
                        (entry.resist ? 0.5 : 1) *
                        Number(entry.customMod);
                    const name = [creature.name];
                    if (creature.number > 0) {
                        name.push(`${creature.number}`);
                    }
                    const message: UpdateLogMessage = {
                        name: name.join(" "),
                        hp: null,
                        temp: false,
                        max: false,
                        status: null,
                        remove_status: null,
                        saved: false,
                        unc: false,
                        ac: null,
                        ac_add: false
                    };

                    if (damage) {
                        let toAdd = Number(damage);
                        toAdd =
                            -1 *
                            Math.sign(toAdd) *
                            Math.max(Math.abs(toAdd) * modifier, 1);
                        message.hp = toAdd;
                        change.damage = toAdd;
                        if (creature.hp.current <= 0) {
                            message.unc = true;
                        }

                    }
                    if (stress) {
                        change.stress = -1 * Number(stress);
                    }
                    if (dc) {
                        if (dc.charAt(0) == "+" || dc.charAt(0) == "-") {
                            creature.dc.current = Number(creature.dc.current) + parseInt(dc);
                            message.ac_add = true;
                        } else if (dc.charAt(0) == "r") {
                            creature.dc.reset();
                        } else {
                            creature.dc.current = parseInt(dc);
                        }
                        message.ac = dc.slice(Number(dc.charAt(0) == "\\"));
                    }
                    if (statuses.length) {
                        message.status = statuses.map((s) => s.name);
                        if (!entry.saved) {
                            change.status = statuses;
                        } else {
                            message.saved = true;
                        }
                    }
                    if (removeStatuses.length) {
                        change.remove_status = removeStatuses;
                    }
                    messages.push(message);
                    updates.push({ creature, change });
                });
                _logger?.logUpdate(messages);
                updateCreatures(...updates);
                updatingCreatures.clear();
                return updatingCreatures;
            }),
        clearUpdate: () =>
            updating.update((updates) => {
                updates.clear();
                return updates;
            }),

        round: $round,

        name: $name,

        party: $party,

        sort: descending,

        state: $state,
        getState: () => get($state),
        toggleState: () => {
            setState(!get($state));
        },
        setState,

        goToNext: () =>
            updateAndSave((creatures) => {
                const current = current_order.findIndex((c) => {
                    return c.spotlight;
                });
                if (current == -1) {
                    current_order[0].spotlight = true;
                } else {
                    let next;
                    let nextIndex = current;
                    do {
                        nextIndex =
                            (((nextIndex + 1) % current_order.length) +
                                current_order.length) %
                            current_order.length;
                        next = current_order[nextIndex];
                        if (nextIndex == current) {
                            break;
                        }
                    } while (!next.enabled);

                    if (next) {
                        current_order[current].spotlight = false;
                        if (nextIndex < current) {
                            const round = get($round) + 1;
                            $round.set(round);

                            for (const creature of creatures) {
                                creature.status = new Set(
                                    [...creature.status].filter(
                                        (s) => !s.resetOnRound
                                    )
                                );
                            }

                            _logger?.log("###", `Round ${round}`);
                        }
                        _logger?.log("#####", `${next.getName()}'s turn`);
                        next.spotlight = true;
                    }
                }
                return creatures;
            }),
        goToPrevious: () =>
            updateAndSave((creatures) => {
                const current = current_order.findIndex((c) => {
                    return c.spotlight;
                });
                if (current == 0 && get($round) == 1) return creatures;

                if (current == -1) {
                    current_order[0].spotlight = true;
                } else {
                    let prev;
                    let prevIndex = current;
                    do {
                        prevIndex =
                            (((prevIndex - 1) % current_order.length) +
                                current_order.length) %
                            current_order.length;
                        prev = current_order[prevIndex];
                        if (prevIndex == current) {
                            break;
                        }
                    } while (!prev.enabled);

                    if (prev) {
                        current_order[current].spotlight = false;
                        if (prevIndex > current) {
                            const round = get($round) - 1;
                            $round.set(round);
                            for (const creature of creatures) {
                                creature.status = new Set(
                                    [...creature.status].filter(
                                        (s) => !s.resetOnRound
                                    )
                                );
                            }
                            _logger?.log("###", `Round ${round}`);
                        }
                        _logger?.log("#####", `${prev.getName()}'s turn`);
                        prev.spotlight = true;
                    }
                }
                return creatures;
            }),

        ordered,

        add: async (
            plugin: InitiativeTracker,
            ...items: Creature[]
        ) =>
            updateAndSave((creatures) => {
                creatures.push(...items);
                _logger?.log(
                    _logger?.join(items.map((c) => c.name)),
                    "added to the combat."
                );
                setNumbers(creatures);
                return creatures;
            }),
        remove: (...items: Creature[]) =>
            updateAndSave((creatures) => {
                creatures = creatures.filter((m) => !items.includes(m));

                _logger?.log(
                    _logger?.join(items.map((c) => c.name)),
                    "removed from the combat."
                );
                return creatures;
            }),
        replace: (old: Creature, replacer: Creature) => {
            updateAndSave((creatures) => {
                creatures.splice(creatures.indexOf(old), 1, replacer);
                setNumbers(creatures);
                return creatures;
            });
        },
        update: () => update((c) => c),
        updateAndSave: () => updateAndSave((c) => c),
        roll: (plugin: InitiativeTracker) =>
            updateAndSave((creatures) => {
                return creatures;
            }),
        new: (plugin: InitiativeTracker, state?: InitiativeViewState) =>
            updateAndSave((creatures) => {
                $round.set(state?.round ?? 1);
                $state.set(state?.state ?? false);
                $name.set(state?.name ?? null);
                $party.set(state?.party ?? plugin.data.defaultParty);

                if (state?.creatures) {
                    creatures = state?.creatures.map((c) => Creature.fromJSON(c, plugin));
                } else {
                    // New encounter
                    creatures = [];
                }
                setNumbers(creatures);
                if (state?.logFile) {
                    _logger?.new(state.logFile).then(() => {
                        $logFile.set(_logger.getFile());
                    });
                }
                if ((!state && _logger) || state?.newLog) {
                    _logger.logging = false;
                    $logFile.set(null);
                }
                return creatures;
            }),
        reset: () =>
            updateAndSave((creatures) => {
                for (let creature of creatures) {
                    creature.dc.reset();
                    creature.hp.reset();
                    creature.stress.reset();
                    creature.enabled = true;
                    creature.status.clear();
                }
                _logger?.log("Encounter HP & Statuses reset");
                return creatures;
            }),

        getOrderedCreatures: () => get(ordered),
        logUpdate: (messages: UpdateLogMessage[]) => {
            const toLog: string[] = [];
            for (const message of messages) {
                const perCreature: string[] = [];
                if (message.hp) {
                    if (message.temp) {
                        perCreature.push(
                            `${message.name
                            } gained ${message.hp.toString()} temporary HP`
                        );
                    } else if (message.max) {
                        if (message.hp < 0) {
                            perCreature.push(
                                `${message.name} took ${(
                                    -1 * message.hp
                                ).toString()} max HP damage${message.unc ? " and died" : ""
                                }`
                            );
                        } else {
                            perCreature.push(
                                `${message.name} gained ${(
                                    -1 * message.hp
                                ).toString()} max HP`
                            );
                        }
                    } else if (message.hp < 0) {
                        perCreature.push(
                            `${message.name} took ${(
                                -1 * message.hp
                            ).toString()} damage${message.unc
                                ? " and was knocked unconscious"
                                : ""
                            }`
                        );
                    } else if (message.hp > 0) {
                        perCreature.push(
                            `${message.name
                            } was healed for ${message.hp.toString()} HP`
                        );
                    }
                }
                if (message.status) {
                    if (perCreature.length) {
                        perCreature.push("and");
                    } else {
                        perCreature.push(message.name);
                    }
                    if (message.saved) {
                        perCreature.push(`saved against ${message.status}`);
                    } else {
                        perCreature.push(`took ${message.status} status`);
                    }
                }
                toLog.push(perCreature.join(" "));
            }
            _logger?.log(`${toLog.join(". ")}.`);
        },
        logFile: $logFile,

        getEncounterState,

        updateState: () => update((c) => c),

        difficulty: (plugin: InitiativeTracker) =>
            derived([creatures, data], ([values]) => {
                const creatureMap = new Map<Creature, number>();
                const rpgSystem = getRpgSystem(plugin);
                const party = plugin.data.parties.find((p) => p.name == get($party));

                for (const creature of values) {
                    if (!creature.enabled) continue;
                    if (creature.friendly) continue;
                    const stats = creature.get_stats();
                    const existing = [...creatureMap].find(([c]) =>
                        equivalent(c, stats)
                    );
                    if (!existing) {
                        creatureMap.set(creature, 1);
                        continue;
                    }
                    creatureMap.set(existing[0], existing[1] + 1);
                }
                // console.log(creatureMap);
                return {
                    difficulty: rpgSystem.getEncounterDifficulty(
                        creatureMap,
                        party
                    ),
                    thresholds: rpgSystem.getDifficultyThresholds(party),
                    labels: rpgSystem.systemDifficulties
                };
            })
    };
}

export const tracker = createTracker();

