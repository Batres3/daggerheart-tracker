import type { Party } from "src/settings/settings.types";
import { writable } from "svelte/store";

const empty_party = {
    name: "",
    players: 0,
    level: 1
}

function createPartyStore() {
    const { subscribe, set, update } = writable<Party>({ ...empty_party });

    return {
        subscribe,
        set,
        update,
        empty: () => set({ ...empty_party })
    }
}
export const party = createPartyStore();
