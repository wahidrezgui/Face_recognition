import { nodeLabel } from './organization/departmentTreeHelpers';

export function toTreeSelectValue(depId) {
  if (depId === null || depId === undefined || depId === '' || Number(depId) === 0) {
    return null;
  }

  const key = String(depId);

  return { [key]: true };
}

export function extractDeptKey(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);

    return keys.length ? keys[0] : null;
  }

  return String(value);
}

export function normalizeDepartmentTree(nodes, locale = 'ar') {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.map((node) => {
    const normalized = {
      key: String(node.key),
      label: nodeLabel(node, locale),
      icon: node.icon || 'pi pi-server',
    };

    if (Array.isArray(node.children) && node.children.length > 0) {
      normalized.children = normalizeDepartmentTree(node.children, locale);
    }

    return normalized;
  });
}

export function findDepartmentLabel(nodes, depId) {
  if (!depId || !Array.isArray(nodes) || nodes.length === 0) {
    return '';
  }

  const target = String(depId);

  for (const node of nodes) {
    if (String(node.key) === target) {
      return node.label || '';
    }

    if (node.children?.length) {
      const nested = findDepartmentLabel(node.children, depId);
      if (nested) {
        return nested;
      }
    }
  }

  return '';
}

export async function applyTreeSelectValue(setter, depId) {
  setter(null);
  await new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  setter(toTreeSelectValue(depId));
}

export function collectDescendantDeptIds(nodes, deptId) {
  if (!deptId || !Array.isArray(nodes) || nodes.length === 0) {
    return [];
  }

  const targetId = String(deptId);
  const ids = [targetId];

  const walk = (children) => {
    for (const child of children) {
      ids.push(String(child.key));
      if (child.children?.length) {
        walk(child.children);
      }
    }
  };

  const findAndCollect = (treeNodes) => {
    for (const node of treeNodes) {
      if (String(node.key) === targetId) {
        if (node.children?.length) {
          walk(node.children);
        }

        return true;
      }

      if (node.children?.length && findAndCollect(node.children)) {
        return true;
      }
    }

    return false;
  };

  findAndCollect(nodes);

  return ids;
}

export function filterDepartmentTreeExcluding(nodes, excludeIds) {
  const excluded = new Set((excludeIds || []).map(String));

  function filterNode(node) {
    const key = String(node.key ?? node.id);
    if (excluded.has(key)) {
      return null;
    }

    const filteredChildren = (node.children || [])
      .map(filterNode)
      .filter(Boolean);

    const normalized = {
      key,
      label: node.label || node.name_ar || '',
      icon: node.icon || 'pi pi-server',
    };

    if (filteredChildren.length > 0) {
      normalized.children = filteredChildren;
    }

    return normalized;
  }

  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.map(filterNode).filter(Boolean);
}
