export function countTreeNodes(nodes) {
  if (!Array.isArray(nodes)) {
    return 0;
  }

  return nodes.reduce((total, node) => {
    const children = countTreeNodes(node.children || []);
    return total + 1 + children;
  }, 0);
}

export function nodeLabel(node) {
  return node?.name_ar || node?.label || node?.name_en || '—';
}

export function nodeId(node) {
  if (!node || node.key === 'virtual-root') {
    return null;
  }

  return node?.id ?? node?.key ?? null;
}

export function baseLabel(base) {
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

export function decorateDepartmentNode(node, depth = 0) {
  if (!node) {
    return null;
  }

  const children = (node.children || [])
    .map((child) => decorateDepartmentNode(child, depth + 1))
    .filter(Boolean);

  const childCount = countTreeNodes(children);
  const cardVariant = resolveCardVariant(node);
  const parentId = Number(node.parent_id ?? (depth === 0 ? 0 : -1));

  return {
    ...node,
    id: node.id ?? node.key,
    parent_id: parentId,
    is_company: Number(node.is_company ?? 0),
    label: nodeLabel(node),
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

export function buildCompanyChartUnderRoot(deptRoot) {
  if (!deptRoot) {
    return null;
  }

  if (isCompanyNode(deptRoot)) {
    const tree = buildCompanyOnlyTree(deptRoot);
    return tree ? decorateDepartmentNode(tree, 0) : null;
  }

  const companyRoots = collectCompanyRootsUnderDepartment(deptRoot);

  if (!companyRoots.length) {
    return null;
  }

  const decorated = companyRoots
    .map((node) => decorateDepartmentNode(node, 0))
    .filter(Boolean);

  if (decorated.length === 1) {
    return decorated[0];
  }

  const label = `شركات — ${nodeLabel(deptRoot)}`;

  return decorateDepartmentNode({
    key: `company-virtual-${deptRoot.id ?? deptRoot.key}`,
    id: `company-virtual-${deptRoot.id ?? deptRoot.key}`,
    label,
    name_ar: label,
    name_en: `Companies — ${deptRoot.name_en || nodeLabel(deptRoot)}`,
    type: 'root',
    parent_id: deptRoot.id ?? deptRoot.key,
    is_company: 0,
    children: companyRoots,
  }, 0);
}

export function buildDepartmentChartForRoot(rootNode) {
  const stripped = stripCompaniesFromNode({ ...rootNode });
  return stripped ? decorateDepartmentNode(stripped, 0) : null;
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
export function buildHierarchySections(departments, { includeCompanies = false } = {}) {
  if (!Array.isArray(departments) || departments.length === 0) {
    return [];
  }

  return departments
    .map((root) => {
      const id = root.id ?? root.key;

      return {
        key: `section-${id}`,
        id,
        label: nodeLabel(root),
        departmentChart: buildDepartmentChartForRoot(root),
        companyChart: includeCompanies ? buildCompanyChartUnderRoot(root) : null,
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
