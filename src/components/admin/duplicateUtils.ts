// Utilitário de detecção e agrupamento de duplicados para Material de Campanha e Dobrada

export interface DuplicateGroup<T = any> {
  id: string;
  matchedCriteria: {
    phone?: string;
    email?: string;
    name?: string;
  };
  primaryItem: T; // Item mais recente a ser mantido
  duplicateItems: T[]; // Itens repetidos que podem ser excluídos
  allItems: T[];
  totalCount: number;
}

export function cleanPhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function cleanEmail(email?: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function cleanName(nome?: string, sobrenome?: string): string {
  const full = `${nome || ''} ${sobrenome || ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
  return full;
}

export function findDuplicates<T extends { id: string; nome?: string; sobrenome?: string; whatsapp?: string; email?: string; createdAt?: string }>(
  items: T[]
): {
  groups: DuplicateGroup<T>[];
  totalDuplicateRecords: number;
  duplicateIds: string[];
} {
  if (!items || items.length === 0) {
    return { groups: [], totalDuplicateRecords: 0, duplicateIds: [] };
  }

  // Disjoint-set / Union-Find para agrupar registros conectados por telefone, email ou nome
  const n = items.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const phoneMap = new Map<string, number>();
  const emailMap = new Map<string, number>();
  const nameMap = new Map<string, number>();

  items.forEach((item, index) => {
    const phone = cleanPhone(item.whatsapp);
    const email = cleanEmail(item.email);
    const name = cleanName(item.nome, item.sobrenome);

    // Matching por telefone (se tiver pelo menos 8 dígitos)
    if (phone && phone.length >= 8) {
      if (phoneMap.has(phone)) {
        union(index, phoneMap.get(phone)!);
      } else {
        phoneMap.set(phone, index);
      }
    }

    // Matching por e-mail (se for e-mail válido com @ e . com pelo menos 5 caracteres)
    if (email && email.includes('@') && email.length >= 5) {
      if (emailMap.has(email)) {
        union(index, emailMap.get(email)!);
      } else {
        emailMap.set(email, index);
      }
    }

    // Matching por nome completo (se tiver nome e sobrenome com pelo menos 6 caracteres)
    if (name && name.length >= 6 && name.includes(' ')) {
      if (nameMap.has(name)) {
        union(index, nameMap.get(name)!);
      } else {
        nameMap.set(name, index);
      }
    }
  });

  // Agrupar itens pelo root
  const groupMap = new Map<number, T[]>();
  items.forEach((item, index) => {
    const root = find(index);
    if (!groupMap.has(root)) {
      groupMap.set(root, []);
    }
    groupMap.get(root)!.push(item);
  });

  const duplicateGroups: DuplicateGroup<T>[] = [];
  const allDuplicateIds: string[] = [];

  groupMap.forEach((groupItems) => {
    if (groupItems.length > 1) {
      // Ordenar por data de criação decrescente (mais recente primeiro)
      const sorted = [...groupItems].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      const primaryItem = sorted[0];
      const duplicateItems = sorted.slice(1);

      duplicateItems.forEach(d => allDuplicateIds.push(d.id));

      // Extrair critérios coincidentes
      const matchedCriteria: DuplicateGroup<T>['matchedCriteria'] = {};
      const phones = Array.from(new Set(groupItems.map(g => cleanPhone(g.whatsapp)).filter(p => p.length >= 8)));
      if (phones.length === 1 && groupItems[0].whatsapp) {
        matchedCriteria.phone = groupItems[0].whatsapp;
      }
      const emails = Array.from(new Set(groupItems.map(g => cleanEmail(g.email)).filter(e => e.includes('@'))));
      if (emails.length === 1 && groupItems[0].email) {
        matchedCriteria.email = groupItems[0].email;
      }
      const names = Array.from(new Set(groupItems.map(g => cleanName(g.nome, g.sobrenome)).filter(n => n.length >= 6)));
      if (names.length === 1) {
        matchedCriteria.name = `${groupItems[0].nome || ''} ${groupItems[0].sobrenome || ''}`.trim();
      }

      duplicateGroups.push({
        id: primaryItem.id,
        matchedCriteria,
        primaryItem,
        duplicateItems,
        allItems: sorted,
        totalCount: sorted.length
      });
    }
  });

  // Ordenar grupos pelo número de duplicatas decrescente
  duplicateGroups.sort((a, b) => b.duplicateItems.length - a.duplicateItems.length);

  return {
    groups: duplicateGroups,
    totalDuplicateRecords: allDuplicateIds.length,
    duplicateIds: allDuplicateIds
  };
}
