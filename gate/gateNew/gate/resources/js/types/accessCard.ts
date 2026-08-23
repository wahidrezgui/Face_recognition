export interface AccessCardTemplate {
    content: string;
    width: number;
    height: number;
}

export interface AccessCardZone {
    id: number;
    name_ar: string | null;
    name_en: string;
    color: string;
    pattern_type: string;
    pattern_color: string | null;
}

export interface BadgeLog {
    id: number;
    date_printed: string;
    badge_expiry_date: string | null;
    printed_by: string | null;
    base: { id: number; name_ar: string; name_en: string } | null;
    returned_at: string | null;
    returned_by: string | null;
}

export interface AccessCardResponse {
    front: AccessCardTemplate | null;
    back: AccessCardTemplate | null;
    values: Record<string, string>;
    zones: AccessCardZone[];
    qrcode: string;
    photoPath: string | null;
    basePhotoPath: string | null;
    badgeLogs: BadgeLog[];
}

/** One employee's card payload within a bulk print job — same shape as
 * `AccessCardResponse` plus the id it belongs to. */
export interface BulkAccessCardEntry extends AccessCardResponse {
    employeeId: number;
}
