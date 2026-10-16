// Likely-duplicate detection. This is advisory only: the create/update path
// never treats it as a hard uniqueness constraint, so a user may legitimately
// keep multiple plans from the same provider.

export function normalizeServiceName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isPotentialDuplicate(candidate, existing) {
  const nameMatches =
    !!candidate.service_name &&
    normalizeServiceName(candidate.service_name) === normalizeServiceName(existing.service_name);
  const keyMatches =
    !!candidate.service_key &&
    !!existing.service_key &&
    candidate.service_key === existing.service_key;

  if (!nameMatches && !keyMatches) return false;

  const samePrice = Number(candidate.price) === Number(existing.price);
  const sameCurrency = candidate.currency_code === existing.currency_code;
  const sameCycle = candidate.billing_cycle === existing.billing_cycle;

  return samePrice && sameCurrency && sameCycle;
}

export function findPotentialDuplicates(existingList, candidate, excludeId = null) {
  return existingList
    .filter((existing) => {
      if (excludeId !== null && Number(existing.id) === Number(excludeId)) return false;
      return isPotentialDuplicate(candidate, existing);
    })
    .map((existing) => ({
      id: existing.id,
      service_name: existing.service_name,
      price: existing.price,
      currency_code: existing.currency_code,
      billing_cycle: existing.billing_cycle,
      next_renewal_date: existing.next_renewal_date,
      status: existing.status,
    }));
}
