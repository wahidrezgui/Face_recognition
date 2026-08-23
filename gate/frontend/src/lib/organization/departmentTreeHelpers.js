export function countTreeNodes(nodes) {
  if (!Array.isArray(nodes)) {
    return 0;
  }

  return nodes.reduce((total, node) => {
    const children = countTreeNodes(node.children || []);
    return total + 1 + children;
  }, 0);
}

export function nodeLabel(node, locale = 'ar') {
  if (locale === 'en') {
    return node?.name_en || node?.label || node?.name_ar || '—';
  }
  return node?.name_ar || node?.label || node?.name_en || '—';
}

export function nodeId(node) {
  if (!node || node.key === 'virtual-root') {
    return null;
  }

  return node?.id ?? node?.key ?? null;
}

/** Recursively find a node by id/key anywhere in the (possibly multi-root) forest. */
export function findDepartmentNodeById(nodes, id) {
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

/** Recursively find and splice out the node with this id (subtree stays attached). Mutates in place. */
export function removeDepartmentNodeById(nodes, id) {
  if (!Array.isArray(nodes) || id === null || id === undefined) {
    return null;
  }

  const targetId = Number(id);
  const idx = nodes.findIndex((node) => Number(node.id ?? node.key) === targetId);

  if (idx !== -1) {
    const [removed] = nodes.splice(idx, 1);
    return removed;
  }

  for (const node of nodes) {
    if (Array.isArray(node.children) && node.children.length) {
      const removed = removeDepartmentNodeById(node.children, id);
      if (removed) {
        return removed;
      }
    }
  }

  return null;
}

/** Find the parent by id anywhere in the forest and push `node` onto its children. Mutates in place. */
export function insertDepartmentNodeUnderParentId(nodes, parentId, node) {
  const parent = findDepartmentNodeById(nodes, parentId);
  if (!parent) {
    return false;
  }

  if (!Array.isArray(parent.children)) {
    parent.children = [];
  }
  parent.children.push(node);
  return true;
}

/** Find a node by id and merge `patch` onto it in place (no reparenting). */
export function updateDepartmentNodeFields(nodes, id, patch) {
  const node = findDepartmentNodeById(nodes, id);
  if (!node) {
    return false;
  }

  Object.assign(node, patch);
  return true;
}

export function baseLabel(base, locale = 'ar') {
  if (locale === 'en') {
    return base?.name_en || base?.name_ar || '—';
  }
  return base?.name_ar || base?.name_en || '—';
}

export function linkedBases(node) {
  return Array.isArray(node?.bases) ? node.bases : [];
}

export function isCompanyNode(node) {
  return Number(node?.is_company) === 1 || node?.type === 'company';
}

export function isTreeRootNode(node) {
  if (!node || node.key === 'virtual-root' || node.type === 'root') {
    return false;
  }

  return Number(node?.parent_id) === 0;
}

export function resolveCardVariant(node) {
  if (node?.type === 'root' || node?.key === 'virtual-root') {
    return 'virtual-root';
  }

  if (isCompanyNode(node)) {
    return 'company';
  }

  if (isTreeRootNode(node)) {
    return 'tree-root';
  }

  return 'department';
}

export function decorateDepartmentNode(node, depth = 0, locale = 'ar') {
  if (!node) {
    return null;
  }

  const children = (node.children || [])
    .map((child) => decorateDepartmentNode(child, depth + 1, locale))
    .filter(Boolean);

  const childCount = countTreeNodes(children);
  const cardVariant = resolveCardVariant(node);
  const parentId = Number(node.parent_id ?? (depth === 0 ? 0 : -1));

  return {
    ...node,
    id: node.id ?? node.key,
    parent_id: parentId,
    is_company: Number(node.is_company ?? 0),
    label: nodeLabel(node, locale),
    name_ar: node.name_ar || node.label || '',
    name_en: node.name_en || '',
    depth,
    childCount,
    directChildCount: children.length,
    cardVariant,
    isTreeRoot: cardVariant === 'tree-root',
    isCompany: cardVariant === 'company',
    bases: Array.isArray(node.bases) ? node.bases : [],
    children,
  };
}

/** Remove company nodes; keep department-only hierarchy. */
export function stripCompaniesFromNode(node) {
  if (!node || isCompanyNode(node)) {
    return null;
  }

  return {
    ...node,
    children: (node.children || [])
      .map(stripCompaniesFromNode)
      .filter(Boolean),
  };
}

/** Keep only company nodes and nested company children. */
export function buildCompanyOnlyTree(node) {
  if (!node || !isCompanyNode(node)) {
    return null;
  }

  return {
    ...node,
    children: (node.children || [])
      .map(buildCompanyOnlyTree)
      .filter(Boolean),
  };
}

/** Collect top-level company subtrees under a department root. */
export function collectCompanyRootsUnderDepartment(node) {
  if (!node) {
    return [];
  }

  if (isCompanyNode(node)) {
    const tree = buildCompanyOnlyTree(node);
    return tree ? [tree] : [];
  }

  const companies = [];

  for (const child of node.children || []) {
    if (isCompanyNode(child)) {
      const tree = buildCompanyOnlyTree(child);
      if (tree) {
        companies.push(tree);
      }
    } else {
      companies.push(...collectCompanyRootsUnderDepartment(child));
    }
  }

  return companies;
}

export function buildCompanyChartUnderRoot(deptRoot, locale = 'ar') {
  if (!deptRoot) {
    return null;
  }

  if (isCompanyNode(deptRoot)) {
    const tree = buildCompanyOnlyTree(deptRoot);
    return tree ? decorateDepartmentNode(tree, 0, locale) : null;
  }

  const companyRoots = collectCompanyRootsUnderDepartment(deptRoot);

  if (!companyRoots.length) {
    return null;
  }

  const decorated = companyRoots
    .map((node) => decorateDepartmentNode(node, 0, locale))
    .filter(Boolean);

  if (decorated.length === 1) {
    return decorated[0];
  }

  const rootLabel = nodeLabel(deptRoot, locale);
  const nameAr = `شركات — ${nodeLabel(deptRoot, 'ar')}`;
  const nameEn = `Companies — ${deptRoot.name_en || nodeLabel(deptRoot, 'en')}`;

  return decorateDepartmentNode({
    key: `company-virtual-${deptRoot.id ?? deptRoot.key}`,
    id: `company-virtual-${deptRoot.id ?? deptRoot.key}`,
    label: rootLabel,
    name_ar: nameAr,
    name_en: nameEn,
    type: 'root',
    parent_id: deptRoot.id ?? deptRoot.key,
    is_company: 0,
    children: companyRoots,
  }, 0, locale);
}

export function buildDepartmentChartForRoot(rootNode, locale = 'ar') {
  const stripped = stripCompaniesFromNode({ ...rootNode });
  return stripped ? decorateDepartmentNode(stripped, 0, locale) : null;
}

/** Top-level org roots — one card per parent_id=0 department (no companies). */
export function extractOrganizationRoots(departments) {
  if (!Array.isArray(departments) || departments.length === 0) {
    return [];
  }

  const roots = departments.filter(
    (node) => Number(node?.parent_id) === 0 && !isCompanyNode(node),
  );

  if (roots.length) {
    return roots.map(stripCompaniesFromNode).filter(Boolean);
  }

  return departments.map(stripCompaniesFromNode).filter(Boolean);
}

/**
 * Split each top-level root into department-only charts.
 */
export function buildHierarchySections(departments, { includeCompanies = false, locale = 'ar' } = {}) {
  if (!Array.isArray(departments) || departments.length === 0) {
    return [];
  }

  return departments
    .map((root) => {
      const id = root.id ?? root.key;

      return {
        key: `section-${id}`,
        id,
        label: nodeLabel(root, locale),
        departmentChart: buildDepartmentChartForRoot(root, locale),
        companyChart: includeCompanies ? buildCompanyChartUnderRoot(root, locale) : null,
      };
    })
    .filter((section) => section.departmentChart || section.companyChart);
}

export function collectChartRootsFromSections(sections) {
  const roots = [];

  for (const section of sections) {
    if (section.departmentChart) {
      roots.push(section.departmentChart);
    }
    if (section.companyChart) {
      roots.push(section.companyChart);
    }
  }

  return roots;
}

export function collectCollapsibleKeys(node, keys = {}) {
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

export function collectCollapsibleKeysFromForest(roots) {
  const keys = {};

  for (const root of roots) {
    collectCollapsibleKeys(root, keys);
  }

  return keys;
}

export function buildDefaultCollapsedKeys(node, maxVisibleDepth = 2, keys = {}) {
  if (!node) {
    return keys;
  }

  const depth = node.depth ?? 0;

  if (node.children?.length && depth >= maxVisibleDepth) {
    keys[node.key] = true;
  }

  for (const child of node.children || []) {
    buildDefaultCollapsedKeys(child, maxVisibleDepth, keys);
  }

  return keys;
}

export function buildDefaultCollapsedKeysForForest(roots, maxVisibleDepth = 2) {
  const keys = {};

  for (const root of roots) {
    buildDefaultCollapsedKeys(root, maxVisibleDepth, keys);
  }

  return keys;
}

export function filterDepartmentTree(departments, query) {
  const trimmed = query?.trim().toLowerCase();

  if (!trimmed) {
    return departments;
  }

  function filterNode(node) {
    if (isCompanyNode(node)) {
      return null;
    }

    const haystack = `${node.name_ar || ''} ${node.name_en || ''} ${node.label || ''}`.toLowerCase();
    const selfMatch = haystack.includes(trimmed);
    const filteredChildren = (node.children || [])
      .map(filterNode)
      .filter(Boolean);

    if (selfMatch || filteredChildren.length) {
      return {
        ...node,
        children: selfMatch
          ? (node.children || []).map(filterNode).filter(Boolean)
          : filteredChildren,
      };
    }

    return null;
  }

  return departments.map(filterNode).filter(Boolean);
}
