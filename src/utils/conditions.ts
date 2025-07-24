import type { Condition } from "src/types/creatures";

export const Conditions: Condition[] = [
    {
        name: "Hidden",
        id: "Hidden",
        description:
            "Any rolls against a Hidden creature have disadvantage. After an adversary moves to where they would see you, you move into their line of sight, or you make an attack, you are no longer Hidden"
    },
    {
        name: "Vulnerable",
        id: "Vulnerable",
        description:
            "When a creature is Vulnerable, all rolls targeting them have advantage"
    },
    {
        name: "Restrained",
        id: "Restrained",
        description:
            "Restrained characters can’t move, but can still take actions from their current position"
    },
    {
        name: "Unconscious",
        id: "Unconscious",
        description:
            "This character is unconscious, players get to make a Death Move"
    },
];
