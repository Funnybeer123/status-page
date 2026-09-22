import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { buildGenerations, TreePerson } from "../src/lib/tree";

function person(id: string, name: string): TreePerson {
  return {
    id,
    familyId: "fam",
    displayName: name,
    givenName: name,
    familyName: null,
    birthDate: null,
    deathDate: null,
    notes: null,
    profileAssetId: null,
    sex: null,
    gedcomXref: null,
    causeOfDeath: null,
    languages: null,
    burialPlot: null,
    deletedAt: null,
    profileUrl: null,
  };
}

test("buildGenerations stacks parents, partners, and children", () => {
  const rose = person("rose", "Rose");
  const louis = person("louis", "Louis");
  const helen = person("helen", "Helen");
  const nora = person("nora", "Nora");
  const { generation, rows } = buildGenerations(
    [rose, louis, helen, nora],
    [
      { id: "p1", familyId: "fam", type: RelType.partner, fromPersonId: "rose", toPersonId: "louis", startedAt: null, endedAt: null, endedKind: null },
      { id: "c1", familyId: "fam", type: RelType.parent, fromPersonId: "rose", toPersonId: "helen", startedAt: null, endedAt: null, endedKind: null },
      { id: "c2", familyId: "fam", type: RelType.parent, fromPersonId: "louis", toPersonId: "helen", startedAt: null, endedAt: null, endedKind: null },
      { id: "c3", familyId: "fam", type: RelType.parent, fromPersonId: "helen", toPersonId: "nora", startedAt: null, endedAt: null, endedKind: null },
    ],
  );
  assert.equal(generation.get("rose"), 0);
  assert.equal(generation.get("louis"), 0);
  assert.equal(generation.get("helen"), 1);
  assert.equal(generation.get("nora"), 2);
  assert.equal(rows.get(0)?.flat().length, 2);
  assert.equal(rows.get(2)?.flat()[0]?.displayName, "Nora");
});
