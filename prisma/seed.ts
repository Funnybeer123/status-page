import { PrismaClient, Role, RelType, AssetKind, DocKind, EventKind, NameKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@familylineage.app";
const DEMO_PASSWORD = "harvest-dance";

const HARVEST_LETTER = `Cedar Falls, Iowa
18 October 1947

Dearest Ruth,

I must tell you about Saturday night. The Grange hall held its harvest dance, the cider was too sweet, and the fiddle ran a little sharp. I danced three times with Samuel Hart from the north farm. Between the third dance and the door he asked if he might walk me home past the cottonwoods. I said yes. Mother will have opinions. I do not.

He has kind hands, and he calls me Whitaker as if it were a compliment.

Your loving sister,
Eleanor`;

const WEDDING_NOTE = `Cedar Falls, Iowa
14 June 1948

We were married this morning at St. John's with only family in the pews. Sam put a sprig of cedar in his buttonhole. Ellie wore her mother's lace. Afterward we ate cold chicken under the cottonwoods where he first walked her home.

— written in the family Bible`;

const MEG_NOTE = `I keep Ellie's cedar chest in the upstairs hall. The harvest-dance letter is still folded in the tray, next to the picnic reel from 1961. When the grandchildren ask how Grandma met Grandpa, that is the letter I hand them.

— Margaret Chen, 12 March 2016`;

const BEE_STORY = `Sam kept bees after he stopped farming. He swore the cottonwoods hummed in June, and he would not take a comb until the first Saturday after the harvest-dance anniversary. Ellie called it superstition. He called it courtesy to the trees where he asked her to walk home.

— told by Margaret Chen at the kitchen table, Easter 2014`;

function mediaRoot() {
  return process.env.MEDIA_ROOT || join(process.cwd(), "data", "media");
}

function svgPortrait(name: string, initials: string, fill: string, subtitle: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800">
  <rect width="640" height="800" fill="#f3ead8"/>
  <rect x="36" y="36" width="568" height="728" fill="${fill}" rx="8"/>
  <circle cx="320" cy="300" r="120" fill="#faf6ee" fill-opacity="0.18"/>
  <text x="320" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#faf6ee">${initials}</text>
  <text x="320" y="520" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#faf6ee">${escapeXml(name)}</text>
  <text x="320" y="570" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#e8d7b5">${escapeXml(subtitle)}</text>
</svg>`;
}

function svgScene(title: string, caption: string, year: string, fill: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <rect width="960" height="640" fill="${fill}"/>
  <rect x="28" y="28" width="904" height="584" fill="none" stroke="#faf6ee" stroke-opacity="0.35" stroke-width="2"/>
  <text x="480" y="280" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#faf6ee">${escapeXml(title)}</text>
  <text x="480" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#e8d7b5">${escapeXml(caption)}</text>
  <text x="480" y="560" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#c4a574">${escapeXml(year)}</text>
</svg>`;
}

function wrapLines(text: string, width = 56) {
  return text.split("\n").flatMap((line) => {
    if (line.length <= width) return [line];
    const words = line.split(" ");
    const out: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > width) {
        if (current) out.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) out.push(current);
    return out;
  });
}

function svgLetter(text: string) {
  const lines = wrapLines(text);
  const tspans = lines
    .map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 28}">${escapeXml(line) || " "}</tspan>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280" viewBox="0 0 900 1280">
  <rect width="900" height="1280" fill="#f7f1e3"/>
  <rect x="40" y="40" width="820" height="1200" fill="#fffaf0" stroke="#c4a574"/>
  <text x="72" y="100" font-family="Georgia, serif" font-size="20" fill="#2b2118">${tspans}</text>
</svg>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function writeMedia(familyId: string, filename: string, contents: string | Buffer, encoding?: BufferEncoding) {
  const dir = join(mediaRoot(), familyId);
  mkdirSync(dir, { recursive: true });
  const full = join(dir, filename);
  if (typeof contents === "string") {
    writeFileSync(full, contents, encoding ?? "utf8");
  } else {
    writeFileSync(full, contents);
  }
  return `${familyId}/${filename}`;
}

function tryWriteVideo(familyId: string, filename: string) {
  const dir = join(mediaRoot(), familyId);
  mkdirSync(dir, { recursive: true });
  const full = join(dir, filename);
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=0x4d5b3c:s=640x360:d=3",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        full,
      ],
      { stdio: "ignore" },
    );
    return `${familyId}/${filename}`;
  } catch {
    writeFileSync(full, "Hart family picnic reel, 1961 (placeholder).");
    return `${familyId}/${filename}`;
  }
}

function chunkText(text: string) {
  const parts = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

async function ensureHartArchive() {
  const family = await prisma.family.findUnique({ where: { id: "family-hart" } });
  const eleanor = await prisma.person.findUnique({ where: { id: "person-eleanor" } });
  const samuel = await prisma.person.findUnique({ where: { id: "person-samuel" } });
  if (!family || !eleanor || !samuel) return;

  const people = await prisma.person.findMany({ where: { familyId: family.id } });

  const cedar = await prisma.place.upsert({
    where: { id: "place-cedar-falls" },
    create: { id: "place-cedar-falls", familyId: family.id, name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", country: "United States" },
    update: { name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", country: "United States" },
  });
  const northFarm = await prisma.place.upsert({
    where: { id: "place-north-farm" },
    create: { id: "place-north-farm", familyId: family.id, name: "North farm", locality: "Cedar Falls", region: "Iowa", country: "United States" },
    update: { name: "North farm" },
  });
  const iowaCity = await prisma.place.upsert({
    where: { id: "place-iowa-city" },
    create: { id: "place-iowa-city", familyId: family.id, name: "Iowa City", locality: "Iowa City", region: "Iowa", country: "United States" },
    update: { name: "Iowa City" },
  });
  const grange = await prisma.place.upsert({
    where: { id: "place-grange" },
    create: { id: "place-grange", familyId: family.id, name: "Grange hall", locality: "Cedar Falls", region: "Iowa", country: "United States" },
    update: { name: "Grange hall" },
  });

  await prisma.personName.upsert({
    where: { id: "name-eleanor-maiden" },
    create: {
      id: "name-eleanor-maiden",
      familyId: family.id,
      personId: eleanor.id,
      kind: NameKind.maiden,
      name: "Eleanor Whitaker",
      startedAt: new Date("1928-03-12"),
      endedAt: new Date("1948-06-14"),
    },
    update: { name: "Eleanor Whitaker", kind: NameKind.maiden },
  });
  await prisma.personName.upsert({
    where: { id: "name-eleanor-ellie" },
    create: {
      id: "name-eleanor-ellie",
      familyId: family.id,
      personId: eleanor.id,
      kind: NameKind.nickname,
      name: "Ellie",
    },
    update: { name: "Ellie" },
  });
  await prisma.personName.upsert({
    where: { id: "name-samuel-sam" },
    create: {
      id: "name-samuel-sam",
      familyId: family.id,
      personId: samuel.id,
      kind: NameKind.nickname,
      name: "Sam",
    },
    update: { name: "Sam" },
  });
  const margaret = people.find((person) => person.id === "person-margaret");
  if (margaret) {
    await prisma.personName.upsert({
      where: { id: "name-margaret-meg" },
      create: {
        id: "name-margaret-meg",
        familyId: family.id,
        personId: margaret.id,
        kind: NameKind.nickname,
        name: "Meg",
      },
      update: { name: "Meg" },
    });
  }

  await prisma.residence.upsert({
    where: { id: "res-eleanor-cedar" },
    create: {
      id: "res-eleanor-cedar",
      familyId: family.id,
      personId: eleanor.id,
      placeId: cedar.id,
      startedAt: new Date("1928-03-12"),
      endedAt: new Date("2015-06-03"),
      notes: "Whitaker house, then the north farm after she married Sam.",
    },
    update: { notes: "Whitaker house, then the north farm after she married Sam." },
  });
  await prisma.residence.upsert({
    where: { id: "res-samuel-farm" },
    create: {
      id: "res-samuel-farm",
      familyId: family.id,
      personId: samuel.id,
      placeId: northFarm.id,
      startedAt: new Date("1926-09-08"),
      endedAt: new Date("2018-01-19"),
      notes: "North of Cedar Falls. Bees after the last harvest.",
    },
    update: { notes: "North of Cedar Falls. Bees after the last harvest." },
  });
  if (margaret) {
    await prisma.residence.upsert({
      where: { id: "res-margaret-iowa-city" },
      create: {
        id: "res-margaret-iowa-city",
        familyId: family.id,
        personId: margaret.id,
        placeId: iowaCity.id,
        startedAt: new Date("1970-08-01"),
        endedAt: new Date("1984-06-01"),
        notes: "University years, then the first house with Wei.",
      },
      update: {},
    });
  }

  for (const person of people) {
    if (person.birthDate) {
      await prisma.lifeEvent.upsert({
        where: { id: `event-${person.id}-birth` },
        create: {
          id: `event-${person.id}-birth`,
          familyId: family.id,
          personId: person.id,
          kind: EventKind.birth,
          title: `${person.displayName} born`,
          happenedOn: person.birthDate,
          placeId: person.id === eleanor.id || person.id === samuel.id ? cedar.id : null,
        },
        update: { happenedOn: person.birthDate, title: `${person.displayName} born` },
      });
    }
    if (person.deathDate) {
      await prisma.lifeEvent.upsert({
        where: { id: `event-${person.id}-death` },
        create: {
          id: `event-${person.id}-death`,
          familyId: family.id,
          personId: person.id,
          kind: EventKind.death,
          title: `${person.displayName} died`,
          happenedOn: person.deathDate,
          placeId: cedar.id,
        },
        update: { happenedOn: person.deathDate },
      });
    }
  }

  await prisma.lifeEvent.upsert({
    where: { id: "event-harvest-dance" },
    create: {
      id: "event-harvest-dance",
      familyId: family.id,
      personId: eleanor.id,
      otherPersonId: samuel.id,
      placeId: grange.id,
      kind: EventKind.other,
      title: "Harvest dance at the Grange hall",
      summary: "They danced three times. He asked to walk her home past the cottonwoods.",
      happenedOn: new Date("1947-10-12"),
    },
    update: { summary: "They danced three times. He asked to walk her home past the cottonwoods." },
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-ellie-sam-marriage" },
    create: {
      id: "event-ellie-sam-marriage",
      familyId: family.id,
      personId: eleanor.id,
      otherPersonId: samuel.id,
      placeId: cedar.id,
      kind: EventKind.marriage,
      title: "Eleanor Hart and Samuel Hart married",
      summary: "St. John's, then cold chicken under the cottonwoods.",
      happenedOn: new Date("1948-06-14"),
    },
    update: {},
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-sam-bees" },
    create: {
      id: "event-sam-bees",
      familyId: family.id,
      personId: samuel.id,
      placeId: northFarm.id,
      kind: EventKind.occupation,
      title: "Samuel kept bees on the north farm",
      summary: "After he stopped farming he would not take a comb until after the harvest-dance anniversary.",
      happenedOn: new Date("1988-06-01"),
    },
    update: {},
  });
  const wei = people.find((person) => person.id === "person-wei");
  if (margaret && wei) {
    await prisma.lifeEvent.upsert({
      where: { id: "event-meg-wei-marriage" },
      create: {
        id: "event-meg-wei-marriage",
        familyId: family.id,
        personId: margaret.id,
        otherPersonId: wei.id,
        placeId: iowaCity.id,
        kind: EventKind.marriage,
        title: "Margaret Chen and Wei Chen married",
        happenedOn: new Date("1981-09-05"),
      },
      update: {},
    });
  }

  const beeDoc = await prisma.document.upsert({
    where: { id: "doc-bee-story" },
    create: {
      id: "doc-bee-story",
      familyId: family.id,
      title: "Sam and the cottonwood bees",
      kind: DocKind.story,
      transcript: BEE_STORY,
      writtenAt: new Date("2014-04-20"),
      people: { create: [{ personId: samuel.id }, { personId: eleanor.id }, { personId: "person-margaret" }] },
    },
    update: { transcript: BEE_STORY, title: "Sam and the cottonwood bees" },
  });
  await prisma.chunk.deleteMany({ where: { documentId: beeDoc.id } });
  await prisma.chunk.create({
    data: { familyId: family.id, documentId: beeDoc.id, personId: samuel.id, content: BEE_STORY },
  });
  await prisma.story.upsert({
    where: { id: "story-cottonwood-bees" },
    create: {
      id: "story-cottonwood-bees",
      familyId: family.id,
      title: "Sam and the cottonwood bees",
      body: BEE_STORY,
      recordedAt: new Date("2014-04-20"),
      tellerPersonId: "person-margaret",
      documentId: beeDoc.id,
      people: { create: [{ personId: samuel.id }, { personId: eleanor.id }, { personId: "person-margaret" }] },
    },
    update: { body: BEE_STORY, documentId: beeDoc.id },
  });

  const chest = await prisma.document.findUnique({ where: { id: "doc-chest" } });
  if (chest) {
    await prisma.story.upsert({
      where: { id: "story-cedar-chest" },
      create: {
        id: "story-cedar-chest",
        familyId: family.id,
        title: "The cedar chest in the upstairs hall",
        body: MEG_NOTE,
        recordedAt: new Date("2016-03-12"),
        tellerPersonId: "person-margaret",
        documentId: chest.id,
        people: { create: [{ personId: "person-margaret" }, { personId: eleanor.id }, { personId: samuel.id }] },
      },
      update: { body: MEG_NOTE },
    });
  }

  await prisma.citation.upsert({
    where: { id: "cite-eleanor-maiden" },
    create: {
      id: "cite-eleanor-maiden",
      familyId: family.id,
      claim: "Born Eleanor Whitaker; Sam still called her Whitaker after they married.",
      personId: eleanor.id,
      nameId: "name-eleanor-maiden",
      documentId: "doc-harvest",
      pageNote: "He calls me Whitaker as if it were a compliment.",
    },
    update: {},
  });
  await prisma.citation.upsert({
    where: { id: "cite-harvest-dance" },
    create: {
      id: "cite-harvest-dance",
      familyId: family.id,
      claim: "They met at the Grange hall harvest dance in October 1947.",
      personId: eleanor.id,
      eventId: "event-harvest-dance",
      documentId: "doc-harvest",
      pageNote: "18 October 1947 letter to Ruth",
    },
    update: {},
  });
  await prisma.citation.upsert({
    where: { id: "cite-marriage" },
    create: {
      id: "cite-marriage",
      familyId: family.id,
      claim: "Married 14 June 1948 at St. John's, then the cottonwoods.",
      personId: eleanor.id,
      eventId: "event-ellie-sam-marriage",
      documentId: "doc-wedding",
    },
    update: {},
  });
}

async function writeHartMedia() {
  const familyId = "family-hart";
  writeMedia(familyId, "eleanor.svg", svgPortrait("Eleanor Hart", "EH", "#8f3d2c", "1928 – 2015"));
  writeMedia(familyId, "samuel.svg", svgPortrait("Samuel Hart", "SH", "#3d2b1f", "1926 – 2018"));
  writeMedia(familyId, "margaret.svg", svgPortrait("Margaret Chen", "MC", "#4d5b3c", "b. 1952"));
  writeMedia(familyId, "wei.svg", svgPortrait("Wei Chen", "WC", "#5c4634", "b. 1950"));
  writeMedia(familyId, "robert.svg", svgPortrait("Robert Hart", "RH", "#6b4b2a", "b. 1955"));
  writeMedia(familyId, "lily.svg", svgPortrait("Lily Chen", "LC", "#7a4a3a", "b. 1984"));
  writeMedia(familyId, "james.svg", svgPortrait("James Chen", "JC", "#3f4d36", "b. 1987"));
  writeMedia(familyId, "daniel.svg", svgPortrait("Daniel Hart", "DH", "#4a3b2c", "b. 1990"));
  writeMedia(familyId, "harvest-dance.svg", svgScene("The harvest dance", "Grange hall, Cedar Falls", "October 1947", "#5c3a2a"));
  writeMedia(familyId, "wedding.svg", svgScene("Wedding day", "St. John's, then the cottonwoods", "14 June 1948", "#3d2b1f"));
  writeMedia(familyId, "picnic.svg", svgScene("Family picnic", "North farm meadow", "Summer 1961", "#4d5b3c"));
  writeMedia(familyId, "harvest-letter.svg", svgLetter(HARVEST_LETTER));
  tryWriteVideo(familyId, "picnic-1961.mp4");
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await writeHartMedia();
    await ensureHartArchive();
    console.log("Demo family already seeded. Refreshed media files and archive layer.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      id: "user-demo",
      email: DEMO_EMAIL,
      name: "Lily Chen",
      passwordHash,
    },
  });

  const family = await prisma.family.create({
    data: {
      id: "family-hart",
      name: "Hart family",
      slug: "hart",
      memberships: {
        create: { userId: user.id, role: Role.owner },
      },
      invites: {
        create: {
          token: "hart-demo-invite",
          role: Role.contributor,
          expiresAt: new Date("2030-01-01"),
        },
      },
    },
  });

  const people = {
    eleanor: await prisma.person.create({
      data: {
        id: "person-eleanor",
        familyId: family.id,
        displayName: "Eleanor Hart",
        givenName: "Eleanor",
        familyName: "Hart",
        birthDate: new Date("1928-03-12"),
        deathDate: new Date("2015-06-03"),
        notes:
          "Called Ellie. Family said she never sat still at a dance. She kept a cedar chest of letters in the upstairs hall. Born Eleanor Whitaker.",
      },
    }),
    samuel: await prisma.person.create({
      data: {
        id: "person-samuel",
        familyId: family.id,
        displayName: "Samuel Hart",
        givenName: "Samuel",
        familyName: "Hart",
        birthDate: new Date("1926-09-08"),
        deathDate: new Date("2018-01-19"),
        notes:
          "Sam farmed north of Cedar Falls and later kept bees. He called Eleanor 'Whitaker' even after they married.",
      },
    }),
    margaret: await prisma.person.create({
      data: {
        id: "person-margaret",
        familyId: family.id,
        displayName: "Margaret Chen",
        givenName: "Margaret",
        familyName: "Chen",
        birthDate: new Date("1952-04-02"),
        notes: "Meg. Teacher, keeper of the cedar chest, mother of Lily and James.",
      },
    }),
    wei: await prisma.person.create({
      data: {
        id: "person-wei",
        familyId: family.id,
        displayName: "Wei Chen",
        givenName: "Wei",
        familyName: "Chen",
        birthDate: new Date("1950-08-09"),
        notes: "Met Margaret at the university library in Iowa City. Civil engineer.",
      },
    }),
    robert: await prisma.person.create({
      data: {
        id: "person-robert",
        familyId: family.id,
        displayName: "Robert Hart",
        givenName: "Robert",
        familyName: "Hart",
        birthDate: new Date("1955-11-17"),
        notes: "Younger child of Ellie and Sam. Still lives near the north farm.",
      },
    }),
    lily: await prisma.person.create({
      data: {
        id: "person-lily",
        familyId: family.id,
        displayName: "Lily Chen",
        givenName: "Lily",
        familyName: "Chen",
        birthDate: new Date("1984-07-21"),
        notes: "Granddaughter who started this archive. Demo login uses her account.",
      },
    }),
    james: await prisma.person.create({
      data: {
        id: "person-james",
        familyId: family.id,
        displayName: "James Chen",
        givenName: "James",
        familyName: "Chen",
        birthDate: new Date("1987-02-04"),
        notes: "Younger grandchild of Ellie and Sam. Asks the questions the letters already answered.",
      },
    }),
    daniel: await prisma.person.create({
      data: {
        id: "person-daniel",
        familyId: family.id,
        displayName: "Daniel Hart",
        givenName: "Daniel",
        familyName: "Hart",
        birthDate: new Date("1990-05-30"),
        notes: "Robert's son. Helped digitize the picnic reel.",
      },
    }),
  };

  await prisma.relationship.createMany({
    data: [
      { familyId: family.id, type: RelType.partner, fromPersonId: people.eleanor.id, toPersonId: people.samuel.id, startedAt: new Date("1948-06-14") },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.eleanor.id, toPersonId: people.margaret.id },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.samuel.id, toPersonId: people.margaret.id },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.eleanor.id, toPersonId: people.robert.id },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.samuel.id, toPersonId: people.robert.id },
      { familyId: family.id, type: RelType.partner, fromPersonId: people.margaret.id, toPersonId: people.wei.id, startedAt: new Date("1981-09-05") },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.margaret.id, toPersonId: people.lily.id },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.wei.id, toPersonId: people.lily.id },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.margaret.id, toPersonId: people.james.id },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.wei.id, toPersonId: people.james.id },
      { familyId: family.id, type: RelType.parent, fromPersonId: people.robert.id, toPersonId: people.daniel.id },
    ],
  });

  const portraits = [
    { person: people.eleanor, file: "eleanor.svg", initials: "EH", fill: "#8f3d2c", sub: "1928 – 2015", title: "Eleanor Hart, about 1948" },
    { person: people.samuel, file: "samuel.svg", initials: "SH", fill: "#3d2b1f", sub: "1926 – 2018", title: "Samuel Hart, north farm" },
    { person: people.margaret, file: "margaret.svg", initials: "MC", fill: "#4d5b3c", sub: "b. 1952", title: "Margaret Chen" },
    { person: people.wei, file: "wei.svg", initials: "WC", fill: "#5c4634", sub: "b. 1950", title: "Wei Chen" },
    { person: people.robert, file: "robert.svg", initials: "RH", fill: "#6b4b2a", sub: "b. 1955", title: "Robert Hart" },
    { person: people.lily, file: "lily.svg", initials: "LC", fill: "#7a4a3a", sub: "b. 1984", title: "Lily Chen" },
    { person: people.james, file: "james.svg", initials: "JC", fill: "#3f4d36", sub: "b. 1987", title: "James Chen" },
    { person: people.daniel, file: "daniel.svg", initials: "DH", fill: "#4a3b2c", sub: "b. 1990", title: "Daniel Hart" },
  ];

  for (const item of portraits) {
    const storagePath = writeMedia(
      family.id,
      item.file,
      svgPortrait(item.person.displayName, item.initials, item.fill, item.sub),
    );
    const asset = await prisma.asset.create({
      data: {
        familyId: family.id,
        kind: AssetKind.photo,
        title: item.title,
        mimeType: "image/svg+xml",
        storagePath,
        capturedAt: item.person.birthDate,
        uploadedById: user.id,
        tags: { create: { personId: item.person.id } },
      },
    });
    await prisma.person.update({
      where: { id: item.person.id },
      data: { profileAssetId: asset.id },
    });
  }

  const dancePath = writeMedia(
    family.id,
    "harvest-dance.svg",
    svgScene("The harvest dance", "Grange hall, Cedar Falls", "October 1947", "#5c3a2a"),
  );
  const dance = await prisma.asset.create({
    data: {
      familyId: family.id,
      kind: AssetKind.photo,
      title: "Harvest dance, Grange hall",
      mimeType: "image/svg+xml",
      storagePath: dancePath,
      capturedAt: new Date("1947-10-12T20:00:00Z"),
      uploadedById: user.id,
      tags: {
        create: [{ personId: people.eleanor.id }, { personId: people.samuel.id }],
      },
    },
  });

  const weddingPath = writeMedia(
    family.id,
    "wedding.svg",
    svgScene("Wedding day", "St. John's, then the cottonwoods", "14 June 1948", "#3d2b1f"),
  );
  await prisma.asset.create({
    data: {
      familyId: family.id,
      kind: AssetKind.photo,
      title: "Ellie and Sam married",
      mimeType: "image/svg+xml",
      storagePath: weddingPath,
      capturedAt: new Date("1948-06-14T14:00:00Z"),
      uploadedById: user.id,
      tags: {
        create: [{ personId: people.eleanor.id }, { personId: people.samuel.id }],
      },
    },
  });

  const picnicPath = writeMedia(
    family.id,
    "picnic.svg",
    svgScene("Family picnic", "North farm meadow", "Summer 1961", "#4d5b3c"),
  );
  await prisma.asset.create({
    data: {
      familyId: family.id,
      kind: AssetKind.photo,
      title: "Hart picnic, 1961",
      mimeType: "image/svg+xml",
      storagePath: picnicPath,
      capturedAt: new Date("1961-07-04T16:00:00Z"),
      uploadedById: user.id,
      tags: {
        create: [
          { personId: people.eleanor.id },
          { personId: people.samuel.id },
          { personId: people.margaret.id },
          { personId: people.robert.id },
        ],
      },
    },
  });

  const videoPath = tryWriteVideo(family.id, "picnic-1961.mp4");
  await prisma.asset.create({
    data: {
      familyId: family.id,
      kind: AssetKind.video,
      title: "Picnic home movie, 1961",
      mimeType: videoPath.endsWith(".mp4") ? "video/mp4" : "text/plain",
      storagePath: videoPath,
      capturedAt: new Date("1961-07-04T16:30:00Z"),
      uploadedById: user.id,
      tags: {
        create: [{ personId: people.margaret.id }, { personId: people.robert.id }],
      },
    },
  });

  const letterPath = writeMedia(family.id, "harvest-letter.svg", svgLetter(HARVEST_LETTER));
  const letterAsset = await prisma.asset.create({
    data: {
      familyId: family.id,
      kind: AssetKind.letter,
      title: "Eleanor to Ruth, harvest dance",
      mimeType: "image/svg+xml",
      storagePath: letterPath,
      capturedAt: new Date("1947-10-18"),
      uploadedById: user.id,
      tags: {
        create: [{ personId: people.eleanor.id }, { personId: people.samuel.id }],
      },
    },
  });

  const harvestDoc = await prisma.document.create({
    data: {
      id: "doc-harvest",
      familyId: family.id,
      assetId: letterAsset.id,
      title: "Letter: Eleanor to Ruth, 18 October 1947",
      kind: DocKind.letter,
      transcript: HARVEST_LETTER,
      writtenAt: new Date("1947-10-18"),
      people: {
        create: [{ personId: people.eleanor.id }, { personId: people.samuel.id }],
      },
    },
  });

  const weddingDoc = await prisma.document.create({
    data: {
      id: "doc-wedding",
      familyId: family.id,
      title: "Family Bible note, 14 June 1948",
      kind: DocKind.note,
      transcript: WEDDING_NOTE,
      writtenAt: new Date("1948-06-14"),
      people: {
        create: [{ personId: people.eleanor.id }, { personId: people.samuel.id }],
      },
    },
  });

  const megDoc = await prisma.document.create({
    data: {
      id: "doc-chest",
      familyId: family.id,
      title: "Margaret on the cedar chest, 2016",
      kind: DocKind.note,
      transcript: MEG_NOTE,
      writtenAt: new Date("2016-03-12"),
      people: {
        create: [
          { personId: people.margaret.id },
          { personId: people.eleanor.id },
          { personId: people.samuel.id },
        ],
      },
    },
  });

  const docs = [
    { doc: harvestDoc, personId: people.eleanor.id },
    { doc: weddingDoc, personId: people.samuel.id },
    { doc: megDoc, personId: people.margaret.id },
  ];
  for (const item of docs) {
    await prisma.chunk.createMany({
      data: chunkText(item.doc.transcript).map((content) => ({
        familyId: family.id,
        documentId: item.doc.id,
        personId: item.personId,
        content,
      })),
    });
  }

  for (const person of Object.values(people)) {
    if (!person.notes) continue;
    const note = await prisma.document.create({
      data: {
        familyId: family.id,
        title: `Notes on ${person.displayName}`,
        kind: DocKind.note,
        transcript: person.notes,
        people: { create: { personId: person.id } },
      },
    });
    await prisma.chunk.create({
      data: {
        familyId: family.id,
        documentId: note.id,
        personId: person.id,
        content: person.notes,
      },
    });
  }

  void dance;
  await ensureHartArchive();
  console.log("Seeded Hart family. Demo login: demo@familylineage.app / harvest-dance");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
