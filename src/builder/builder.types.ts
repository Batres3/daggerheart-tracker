import type { Filter, FilterLayout } from "src/builder/stores/filter/filter";

export interface BuilderState {
    sidebarIcon: boolean;
    showXP: boolean;
    showParty: boolean;
    headers?: TableHeaderState[];
    filters?: {
        layout: FilterLayout;
        filters: Filter[];
    };
}
export enum SortFunctions {
    LOCAL_COMPARE,
    CONVERT_FRACTION,
    CUSTOM
}
export type TableHeaderState = {
    text: string;
    field: string;
    type: SortFunctions;
    func?: string;
};
