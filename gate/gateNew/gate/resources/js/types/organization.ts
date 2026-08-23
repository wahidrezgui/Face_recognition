export interface DepartmentBase {
    id: number;
    name_ar: string;
    name_en: string;
}

export interface DepartmentNode {
    id: number;
    key: number | string;
    label: string;
    name_ar: string;
    name_en: string;
    parent_id: number;
    is_company: number;
    type: 'department';
    icon: string;
    children?: DepartmentNode[];
    bases?: DepartmentBase[];
}

export interface DecoratedDepartmentNode extends DepartmentNode {
    depth: number;
    childCount: number;
    directChildCount: number;
    isTreeRoot: boolean;
    children: DecoratedDepartmentNode[];
    bases: DepartmentBase[];
}

export interface TreeSelectOption {
    key: string;
    label: string;
    icon: string;
    children?: TreeSelectOption[];
}
