import type { Gender } from './employees';

export interface RankCategory {
    id: number;
    name_en: string;
    name_ar: string;
}

export interface CheckTime {
    id: number;
    dep_id: number;
    gender_id: number;
    rank_id: number;
    start_time: string;
    end_time: string;
    gender?: Gender | null;
    // Eloquent serializes relation accessors to snake_case in JSON, so the `rankCategory()`
    // relation on the CheckTime model arrives here as `rank_category`, not `rankCategory`.
    rank_category?: RankCategory | null;
}
