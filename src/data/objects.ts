// One flat index across every fixture set, so anything on the canvas can be found by id alone.
import { APPROVALS } from "./approvals"
import { APPS, CAMPAIGNS, VAULTS } from "./apps"
import { ASSETS } from "./assets"
import { PACKS } from "./packs"
import { PEOPLE } from "./people"

export const ALL_OBJECTS = [...ASSETS, ...PEOPLE, ...PACKS, ...APPS, ...VAULTS, ...CAMPAIGNS, ...APPROVALS]

export function objectById(id: string) {
  return ALL_OBJECTS.find((o) => o.id === id)
}
