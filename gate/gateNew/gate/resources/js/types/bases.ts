export interface GateEntity {
    id: number;
    base_id: number;
    name_en: string;
    name_ar: string | null;
}

export interface ZoneEntity {
    id: number;
    base_id: number;
    name_en: string;
    name_ar: string | null;
    color: string;
    pattern_type: string;
    pattern_color: string | null;
}

export interface BaseEntity {
    id: number;
    name_en: string;
    name_ar: string | null;
    gates: GateEntity[];
    zones: ZoneEntity[];
}
