import stakeholdersManifest from "../../../recon/stakeholders.json";

export type StakeholdersManifest = typeof stakeholdersManifest;

export type StakeholderOrg = StakeholdersManifest["organizations"][number];
export type OfficialPage = StakeholdersManifest["officialPages"][number];
export type DocumentSeed = StakeholdersManifest["documentUrls"][number];

export function loadStakeholders(): StakeholdersManifest {
  return stakeholdersManifest;
}

export function getStakeholderOrganizations(): StakeholderOrg[] {
  return loadStakeholders().organizations;
}

export function getOfficialPages(): OfficialPage[] {
  return loadStakeholders().officialPages;
}

export function getDocumentSeeds(): DocumentSeed[] {
  return loadStakeholders().documentUrls;
}

export function getStakeholderOrgById(id: string): StakeholderOrg | undefined {
  return getStakeholderOrganizations().find((org) => org.id === id);
}

export function normalizeOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findOrgByName(name: string): StakeholderOrg | undefined {
  const normalized = normalizeOrgName(name);
  return getStakeholderOrganizations().find((org) => {
    if (normalizeOrgName(org.name) === normalized) return true;
    return org.aliases?.some((alias) => normalizeOrgName(alias) === normalized);
  });
}
