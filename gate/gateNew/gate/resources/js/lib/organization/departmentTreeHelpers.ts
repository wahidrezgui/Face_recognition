import type {
    DecoratedDepartmentNode,
    DepartmentBase,
    DepartmentNode,
} from '@/types';

export function countTreeNodes(
    nodes: DepartmentNode[] | DecoratedDepartmentNode[] | undefined,
): number {
    if (!Array.isArray(nodes)) {
        return 0;
    }

    return nodes.reduce(
        (total, node) => total + 1 + countTreeNodes(node.children),
        0,
    );
}

export function nodeLabel(
    node: Pick<DepartmentNode, 'name_ar' | 'name_en' | 'label'> | undefined,
    locale = 'ar',
): string {
    if (locale === 'en') {
        return node?.name_en || node?.label || node?.name_ar || '—';
    }

    return node?.name_ar || node?.label || node?.name_en || '—';
}

export function nodeId(
    node: DepartmentNode | DecoratedDepartmentNode,
): number | string | null {
    return node?.id ?? node?.key ?? null;
}

/** Recursively find a node by id/key anywhere in the (possibly multi-root) forest. */
export function findDepartmentNodeById(
    nodes: DepartmentNode[] | undefined,
    id: number | string | null | undefined,
): DepartmentNode | null {
    if (!Array.isArray(nodes) || id === null || id === undefined) {
        return null;
    }

    const targetId = Number(id);

    for (const node of nodes) {
        if (Number(node.id ?? node.key) === targetId) {
            return node;
        }

        if (Array.isArray(node.children) && node.children.length) {
            const found = findDepartmentNodeById(node.children, id);

            if (found) {
                return found;
            }
        }
    }

    return null;
}

export function baseLabel(
    base: DepartmentBase | undefined,
    locale = 'ar',
): string {
    if (locale === 'en') {
        return base?.name_en || base?.name_ar || '—';
    }

    return base?.name_ar || base?.name_en || '—';
}

export function linkedBases(
    node: DepartmentNode | DecoratedDepartmentNode | undefined,
): DepartmentBase[] {
    return Array.isArray(node?.bases) ? node.bases : [];
}

export function isTreeRootNode(node: DepartmentNode | undefined): boolean {
    if (!node) {
        return false;
    }

    return Number(node.parent_id) === 0;
}

export function decorateDepartmentNode(
    node: DepartmentNode,
    depth = 0,
    locale = 'ar',
): DecoratedDepartmentNode {
    const children = (node.children || []).map((child) =>
        decorateDepartmentNode(child, depth + 1, locale),
    );

    const childCount = countTreeNodes(children);
    const isTreeRoot = isTreeRootNode(node);

    return {
        ...node,
        id: node.id ?? node.key,
        parent_id: Number(node.parent_id ?? (depth === 0 ? 0 : -1)),
        is_company: 0,
        label: nodeLabel(node, locale),
        name_ar: node.name_ar || node.label || '',
        name_en: node.name_en || '',
        depth,
        childCount,
        directChildCount: children.length,
        isTreeRoot,
        bases: Array.isArray(node.bases) ? node.bases : [],
        children,
    };
}

/** Top-level org roots — one card per parent_id=0 department. */
export function extractOrganizationRoots(
    departments: DepartmentNode[] | undefined,
): DepartmentNode[] {
    if (!Array.isArray(departments) || departments.length === 0) {
        return [];
    }

    const roots = departments.filter((node) => Number(node?.parent_id) === 0);

    return roots.length ? roots : departments;
}

export function filterDepartmentTree(
    departments: DepartmentNode[],
    query: string,
): DepartmentNode[] {
    const trimmed = query?.trim().toLowerCase();

    if (!trimmed) {
        return departments;
    }

    function filterNode(node: DepartmentNode): DepartmentNode | null {
        const haystack =
            `${node.name_ar || ''} ${node.name_en || ''} ${node.label || ''}`.toLowerCase();
        const selfMatch = haystack.includes(trimmed);
        const filteredChildren = (node.children || [])
            .map(filterNode)
            .filter((n): n is DepartmentNode => n !== null);

        if (selfMatch || filteredChildren.length) {
            return {
                ...node,
                children: selfMatch
                    ? (node.children || [])
                          .map(filterNode)
                          .filter((n): n is DepartmentNode => n !== null)
                    : filteredChildren,
            };
        }

        return null;
    }

    return departments
        .map(filterNode)
        .filter((n): n is DepartmentNode => n !== null);
}

export function collectCollapsibleKeys(
    node: DecoratedDepartmentNode | undefined,
    keys: Record<string | number, boolean> = {},
): Record<string | number, boolean> {
    if (!node) {
        return keys;
    }

    if (node.children?.length) {
        keys[node.key] = true;
    }

    for (const child of node.children) {
        collectCollapsibleKeys(child, keys);
    }

    return keys;
}

export function collectCollapsibleKeysFromForest(
    roots: DecoratedDepartmentNode[],
): Record<string | number, boolean> {
    const keys: Record<string | number, boolean> = {};

    for (const root of roots) {
        collectCollapsibleKeys(root, keys);
    }

    return keys;
}

export function buildDefaultCollapsedKeys(
    node: DecoratedDepartmentNode | undefined,
    maxVisibleDepth = 2,
    keys: Record<string | number, boolean> = {},
): Record<string | number, boolean> {
    if (!node) {
        return keys;
    }

    if (node.children?.length && node.depth >= maxVisibleDepth) {
        keys[node.key] = true;
    }

    for (const child of node.children || []) {
        buildDefaultCollapsedKeys(child, maxVisibleDepth, keys);
    }

    return keys;
}

export function buildDefaultCollapsedKeysForForest(
    roots: DecoratedDepartmentNode[],
    maxVisibleDepth = 2,
): Record<string | number, boolean> {
    const keys: Record<string | number, boolean> = {};

    for (const root of roots) {
        buildDefaultCollapsedKeys(root, maxVisibleDepth, keys);
    }

    return keys;
}
