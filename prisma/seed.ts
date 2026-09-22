import { PrismaClient, Role, RelType, AssetKind, DocKind, EventKind, NameKind, DatePrecision } from "@prisma/client";
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

const PICNIC_TRANSCRIPT = `Helen speaking over the picnic reel, July 1961. Mother is cutting Sunday rolls under the cottonwoods. Father will not take a comb from the bees until after the harvest-dance anniversary. The children keep asking how Grandma met Grandpa. I tell them: the Grange hall, the cider, and the walk home.`;

const MEG_NOTE = `I keep Ellie's cedar chest in the upstairs hall. The harvest-dance letter is still folded in the tray, next to the picnic reel from 1961. When the grandchildren ask how Grandma met Grandpa, that is the letter I hand them.

— Margaret Chen, 12 March 2016`;

const BEE_STORY = `Sam kept bees after he stopped farming. He swore the cottonwoods hummed in June, and he would not take a comb until the first Saturday after the harvest-dance anniversary. Ellie called it superstition. He called it courtesy to the trees where he asked her to walk home.

— told by Margaret Chen at the kitchen table, Easter 2014`;

const CAPSULE_LETTER = `Cedar Falls, Iowa
18 October 1948

Lily, if that is still your name when this is opened,

I am writing this the autumn after I married Sam. The cottonwoods still hold the walk home. If you ask how we met, it was the harvest dance, the cider too sweet, and he called me Whitaker as if it were a compliment. Open this in 2047 and tell the children the fiddle ran a little sharp.

Your grandmother,
Eleanor`;

const INTERVIEW_MEET = `He asked to walk me home past the cottonwoods after the third dance. I still smell the cider when I say it. That is the whole of how I met Sam.`;

const HARVEST_TRANSLATION = `Dear Ruth — Saturday night at the Grange hall we had a harvest dance. The cider was too sweet and the fiddle ran a little sharp. I danced three times with Samuel Hart from the north farm. After the third dance he asked to walk me home past the cottonwoods. I said yes. Mother will have opinions. I do not. He has kind hands, and he calls me Whitaker as if it were a compliment. Love, Eleanor.`;

const RUTH_REPLY = `Cedar Falls
22 October 1947

Ellie,

Mother does have opinions. I do not. If the cider was too sweet you still said yes. Bring Samuel to Sunday dinner so Father can look at his hands.

Your sister,
Ruth`;

const WEI_MOTHER = `爱荷华城
一九八一年九月四日

伟，
玛格丽特是老师，手很温柔。图书馆是你们遇见的地方。我高兴。
母亲`;

const WEI_MOTHER_EN = `Iowa City
4 September 1981

Wei,
Margaret is a teacher, and her hands are kind. The library is where you found each other. I am glad.
Mother`;

const HART_ASK_ANSWER =
  "Eleanor Whitaker met Samuel Hart at the Grange hall harvest dance in Cedar Falls, Iowa, on a Saturday in October 1947. She wrote to her sister Ruth six days later: they danced three times, the cider was too sweet, the fiddle ran a little sharp, and he asked to walk her home past the cottonwoods. She said yes. They married the following June under those same trees.";

const HART_ASK_FOLLOW =
  "She told Ruth the cider was too sweet. The rest of the letter is still the harvest dance: three dances, a sharp fiddle, and the walk home past the cottonwoods.";

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

function writeWav(familyId: string, filename: string) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(0, 40);
  return writeMedia(familyId, filename, header);
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

  const unitedStates = await prisma.place.upsert({
    where: { id: "place-united-states" },
    create: {
      id: "place-united-states",
      familyId: family.id,
      name: "United States",
      country: "United States",
      kind: "country",
    },
    update: { kind: "country" },
  });
  const iowa = await prisma.place.upsert({
    where: { id: "place-iowa" },
    create: {
      id: "place-iowa",
      familyId: family.id,
      name: "Iowa",
      region: "Iowa",
      country: "United States",
      kind: "state",
      parentId: unitedStates.id,
      latitude: 41.878,
      longitude: -93.0977,
    },
    update: { kind: "state", parentId: unitedStates.id },
  });
  const blackHawk = await prisma.place.upsert({
    where: { id: "place-black-hawk" },
    create: {
      id: "place-black-hawk",
      familyId: family.id,
      name: "Black Hawk County",
      locality: "Black Hawk County",
      region: "Iowa",
      country: "United States",
      kind: "county",
      parentId: iowa.id,
      latitude: 42.47,
      longitude: -92.31,
    },
    update: { kind: "county", parentId: iowa.id },
  });
  const johnson = await prisma.place.upsert({
    where: { id: "place-johnson" },
    create: {
      id: "place-johnson",
      familyId: family.id,
      name: "Johnson County",
      locality: "Johnson County",
      region: "Iowa",
      country: "United States",
      kind: "county",
      parentId: iowa.id,
      latitude: 41.67,
      longitude: -91.59,
    },
    update: { kind: "county", parentId: iowa.id },
  });
  const cedar = await prisma.place.upsert({
    where: { id: "place-cedar-falls" },
    create: {
      id: "place-cedar-falls",
      familyId: family.id,
      name: "Cedar Falls",
      locality: "Cedar Falls",
      region: "Iowa",
      country: "United States",
      kind: "city",
      parentId: blackHawk.id,
      latitude: 42.5278,
      longitude: -92.4453,
    },
    update: {
      name: "Cedar Falls",
      locality: "Cedar Falls",
      region: "Iowa",
      country: "United States",
      kind: "city",
      parentId: blackHawk.id,
      latitude: 42.5278,
      longitude: -92.4453,
    },
  });
  const northFarm = await prisma.place.upsert({
    where: { id: "place-north-farm" },
    create: {
      id: "place-north-farm",
      familyId: family.id,
      name: "North farm",
      locality: "Cedar Falls",
      region: "Iowa",
      country: "United States",
      kind: "place",
      parentId: blackHawk.id,
      latitude: 42.54,
      longitude: -92.452,
    },
    update: { name: "North farm", kind: "place", parentId: blackHawk.id, latitude: 42.54, longitude: -92.452 },
  });
  const iowaCity = await prisma.place.upsert({
    where: { id: "place-iowa-city" },
    create: {
      id: "place-iowa-city",
      familyId: family.id,
      name: "Iowa City",
      locality: "Iowa City",
      region: "Iowa",
      country: "United States",
      kind: "city",
      parentId: johnson.id,
      latitude: 41.6611,
      longitude: -91.5302,
    },
    update: { name: "Iowa City", kind: "city", parentId: johnson.id, latitude: 41.6611, longitude: -91.5302 },
  });
  const grange = await prisma.place.upsert({
    where: { id: "place-grange" },
    create: {
      id: "place-grange",
      familyId: family.id,
      name: "Grange hall",
      locality: "Cedar Falls",
      region: "Iowa",
      country: "United States",
      kind: "place",
      parentId: blackHawk.id,
      latitude: 42.529,
      longitude: -92.446,
    },
    update: { name: "Grange hall", kind: "place", parentId: blackHawk.id, latitude: 42.529, longitude: -92.446 },
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
  await prisma.lifeEvent.upsert({
    where: { id: "event-sam-military" },
    create: {
      id: "event-sam-military",
      familyId: family.id,
      personId: samuel.id,
      placeId: cedar.id,
      kind: EventKind.military,
      title: "Samuel reported for the county draft board",
      summary: "He left the north farm for a week of processing, then came home for harvest.",
      happenedOn: new Date("1944-09-22"),
    },
    update: { happenedOn: new Date("1944-09-22") },
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-eleanor-census" },
    create: {
      id: "event-eleanor-census",
      familyId: family.id,
      personId: eleanor.id,
      placeId: cedar.id,
      kind: EventKind.census,
      title: "Eleanor enumerated on the Cedar Falls census",
      happenedOn: new Date("1950-04-01"),
    },
    update: {},
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-eleanor-burial" },
    create: {
      id: "event-eleanor-burial",
      familyId: family.id,
      personId: eleanor.id,
      placeId: cedar.id,
      kind: EventKind.burial,
      title: "Eleanor buried at Fairview",
      happenedOn: new Date("2015-06-06"),
    },
    update: {},
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-eleanor-school" },
    create: {
      id: "event-eleanor-school",
      familyId: family.id,
      personId: eleanor.id,
      placeId: cedar.id,
      kind: EventKind.education,
      title: "Eleanor finished Cedar Falls High",
      happenedOn: new Date("1945-05-28"),
    },
    update: {},
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-eleanor-religion" },
    create: {
      id: "event-eleanor-religion",
      familyId: family.id,
      personId: eleanor.id,
      placeId: cedar.id,
      kind: EventKind.religion,
      title: "Eleanor confirmed at St. John's",
      happenedOn: new Date("1941-04-13"),
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

  if (wei) {
    await prisma.lifeEvent.upsert({
      where: { id: "event-wei-naturalization" },
      create: {
        id: "event-wei-naturalization",
        familyId: family.id,
        personId: wei.id,
        placeId: iowaCity.id,
        kind: EventKind.naturalization,
        title: "Wei Chen naturalized in Iowa City",
        happenedOn: new Date("1979-05-12"),
      },
      update: {},
    });
  }
  await prisma.lifeEvent.upsert({
    where: { id: "event-samuel-probate" },
    create: {
      id: "event-samuel-probate",
      familyId: family.id,
      personId: samuel.id,
      placeId: cedar.id,
      kind: EventKind.probate,
      title: "Samuel Hart’s estate entered probate",
      happenedOn: new Date("2018-03-02"),
    },
    update: {},
  });

  await prisma.document.upsert({
    where: { id: "doc-eleanor-obit" },
    create: {
      id: "doc-eleanor-obit",
      familyId: family.id,
      title: "Eleanor Hart of Cedar Falls",
      kind: DocKind.obituary,
      transcript: "Eleanor Hart, who danced at the Grange hall in 1947, died at home in Cedar Falls. She is remembered for Sunday rolls and the cedar chest in the upstairs hall.",
      writtenAt: new Date("2015-06-05"),
      people: { create: [{ personId: eleanor.id }, { personId: samuel.id }] },
    },
    update: { title: "Eleanor Hart of Cedar Falls" },
  });
  await prisma.document.upsert({
    where: { id: "doc-samuel-will" },
    create: {
      id: "doc-samuel-will",
      familyId: family.id,
      title: "Samuel Hart’s will",
      kind: DocKind.will,
      transcript: "The north farm and the bee yard stay with the children. The navy hatband goes to whoever still keeps Sunday rolls.",
      writtenAt: new Date("2010-11-02"),
      people: { create: [{ personId: samuel.id }, { personId: eleanor.id }] },
    },
    update: { title: "Samuel Hart’s will" },
  });
  await prisma.tradition.upsert({
    where: { id: "tradition-sunday-rolls" },
    create: {
      id: "tradition-sunday-rolls",
      familyId: family.id,
      personId: eleanor.id,
      title: "Sunday rolls after church",
      summary: "Warm milk, a cake of yeast, and the navy-blue bowl.",
      season: "Sundays",
    },
    update: { title: "Sunday rolls after church" },
  });
  const demo = await prisma.user.findUnique({ where: { id: "user-demo" } });
  if (demo) {
    await prisma.researchTask.upsert({
      where: { id: "task-ask-lily-hatband" },
      create: {
        id: "task-ask-lily-hatband",
        familyId: family.id,
        personId: eleanor.id,
        title: "Ask Lily who kept the navy hatband",
        body: "Margaret mentioned it in the cedar chest note.",
        createdById: demo.id,
      },
      update: { title: "Ask Lily who kept the navy hatband" },
    });
  }

  await prisma.membership.updateMany({
    where: { familyId: family.id, user: { email: DEMO_EMAIL } },
    data: { personId: "person-lily" },
  });
  await prisma.storyPrompt.upsert({
    where: { id: "prompt-how-met" },
    create: {
      id: "prompt-how-met",
      familyId: family.id,
      title: "How did the grandparents meet?",
      body: "Tell it the way you heard it at the kitchen table.",
    },
    update: { title: "How did the grandparents meet?" },
  });
  await prisma.residence.upsert({
    where: { id: "res-eleanor-farm" },
    create: {
      id: "res-eleanor-farm",
      familyId: family.id,
      personId: eleanor.id,
      placeId: northFarm.id,
      startedAt: new Date("1948-06-14"),
      endedAt: new Date("2015-06-03"),
      notes: "After she married Sam she lived on the north farm.",
    },
    update: { notes: "After she married Sam she lived on the north farm." },
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-eleanor-death-alt" },
    create: {
      id: "event-eleanor-death-alt",
      familyId: family.id,
      personId: eleanor.id,
      kind: EventKind.death,
      title: "Eleanor died (cemetery book)",
      happenedOn: new Date("2015-06-04"),
      preferred: false,
      placeId: cedar.id,
    },
    update: { happenedOn: new Date("2015-06-04"), preferred: false },
  });
  await prisma.person.update({
    where: { id: eleanor.id },
    data: {
      causeOfDeath: "In her sleep at home",
      languages: "English",
      burialPlot: "Fairview, lot 14",
    },
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-eleanor-baptism" },
    create: {
      id: "event-eleanor-baptism",
      familyId: family.id,
      personId: eleanor.id,
      placeId: cedar.id,
      kind: EventKind.baptism,
      title: "Eleanor baptised at St. John's",
      happenedOn: new Date("1928-04-08"),
    },
    update: { title: "Eleanor baptised at St. John's" },
  });

  const robert = people.find((person) => person.id === "person-robert");
  const daniel = people.find((person) => person.id === "person-daniel");
  const wedding = await prisma.lifeEvent.findUnique({ where: { id: "event-ellie-sam-marriage" } });
  if (robert) {
    const claire = await prisma.person.upsert({
      where: { id: "person-claire" },
      create: {
        id: "person-claire",
        familyId: family.id,
        displayName: "Claire Hart",
        givenName: "Claire",
        familyName: "Hart",
        birthDate: new Date("1993-09-12"),
        notes: "Robert's younger child. Shares only her father with Daniel.",
      },
      update: {},
    });
    const peter = await prisma.person.upsert({
      where: { id: "person-peter" },
      create: {
        id: "person-peter",
        familyId: family.id,
        displayName: "Peter Hart",
        givenName: "Peter",
        familyName: "Hart",
        birthDate: new Date("1988-04-03"),
        notes: "Robert adopted Peter after the flood year.",
      },
      update: {},
    });
    const helenRowe = await prisma.person.upsert({
      where: { id: "person-helen-rowe" },
      create: {
        id: "person-helen-rowe",
        familyId: family.id,
        displayName: "Helen Rowe",
        givenName: "Helen",
        familyName: "Rowe",
        birthDate: new Date("1958-02-11"),
        notes: "Robert's later partner. Step-parent to Daniel.",
      },
      update: {},
    });
    for (const rel of [
      { fromPersonId: robert.id, toPersonId: claire.id, type: RelType.parent },
      { fromPersonId: robert.id, toPersonId: peter.id, type: RelType.adoptive },
      { fromPersonId: robert.id, toPersonId: helenRowe.id, type: RelType.partner },
      ...(daniel ? [{ fromPersonId: helenRowe.id, toPersonId: daniel.id, type: RelType.step }] : []),
    ]) {
      const existingRel = await prisma.relationship.findFirst({
        where: {
          familyId: family.id,
          fromPersonId: rel.fromPersonId,
          toPersonId: rel.toPersonId,
          type: rel.type,
        },
      });
      if (!existingRel) {
        await prisma.relationship.create({
          data: { familyId: family.id, ...rel, startedAt: rel.type === RelType.partner ? new Date("2001-06-02") : null },
        });
      }
    }
  }
  if (wedding && people.find((person) => person.id === "person-margaret")) {
    await prisma.eventWitness.upsert({
      where: { eventId_personId: { eventId: wedding.id, personId: "person-margaret" } },
      create: {
        familyId: family.id,
        eventId: wedding.id,
        personId: "person-margaret",
        role: "attendant",
      },
      update: { role: "attendant" },
    });
  }
  if (demo) {
    const unknownPath = writeMedia(
      family.id,
      "unknown-faces.svg",
      svgScene("Unknown faces", "Someone at the picnic", "", "#6b5344"),
    );
    const existingUnknown = await prisma.asset.findFirst({ where: { id: "asset-unknown-faces" } });
    if (!existingUnknown) {
      await prisma.asset.create({
        data: {
          id: "asset-unknown-faces",
          familyId: family.id,
          kind: AssetKind.photo,
          title: "Unknown faces at a picnic",
          mimeType: "image/svg+xml",
          storagePath: unknownPath,
          uploadedById: demo.id,
        },
      });
    }
  }

  const lily = people.find((person) => person.id === "person-lily");
  const capsuleDoc = await prisma.document.upsert({
    where: { id: "doc-capsule-lily" },
    create: {
      id: "doc-capsule-lily",
      familyId: family.id,
      title: "Eleanor’s letter for Lily, to open in 2047",
      kind: DocKind.capsule,
      transcript: `Time capsule for Lily Chen, to be opened 2047-10-18.\n\n${CAPSULE_LETTER}`,
      writtenAt: new Date("1948-10-18"),
      people: {
        create: [
          { personId: eleanor.id },
          ...(lily ? [{ personId: lily.id }] : []),
        ],
      },
    },
    update: { transcript: `Time capsule for Lily Chen, to be opened 2047-10-18.\n\n${CAPSULE_LETTER}` },
  });
  await prisma.chunk.deleteMany({ where: { documentId: capsuleDoc.id } });
  await prisma.chunk.create({
    data: { familyId: family.id, documentId: capsuleDoc.id, personId: eleanor.id, content: capsuleDoc.transcript },
  });
  await prisma.timeCapsule.upsert({
    where: { id: "capsule-lily-2047" },
    create: {
      id: "capsule-lily-2047",
      familyId: family.id,
      documentId: capsuleDoc.id,
      addresseeName: "Lily Chen",
      addresseePersonId: lily?.id,
      fromPersonId: eleanor.id,
      openOn: new Date("2047-10-18"),
    },
    update: { addresseeName: "Lily Chen", openOn: new Date("2047-10-18") },
  });

  if (margaret) {
    const interviewDoc = await prisma.document.upsert({
      where: { id: "doc-interview-meg-meet" },
      create: {
        id: "doc-interview-meg-meet",
        familyId: family.id,
        title: "Margaret Chen on “How did you meet the person you married?”",
        kind: DocKind.story,
        transcript: INTERVIEW_MEET,
        writtenAt: new Date("2014-04-20"),
        people: { create: [{ personId: margaret.id }] },
      },
      update: { transcript: INTERVIEW_MEET },
    });
    await prisma.chunk.deleteMany({ where: { documentId: interviewDoc.id } });
    await prisma.chunk.create({
      data: { familyId: family.id, documentId: interviewDoc.id, personId: margaret.id, content: INTERVIEW_MEET },
    });
    const interviewStory = await prisma.story.upsert({
      where: { id: "story-interview-meg-meet" },
      create: {
        id: "story-interview-meg-meet",
        familyId: family.id,
        title: "Margaret Chen on “How did you meet the person you married?”",
        body: INTERVIEW_MEET,
        recordedAt: new Date("2014-04-20"),
        tellerPersonId: margaret.id,
        documentId: interviewDoc.id,
        people: { create: [{ personId: margaret.id }] },
      },
      update: { body: INTERVIEW_MEET, documentId: interviewDoc.id },
    });
    await prisma.interviewAnswer.upsert({
      where: { personId_promptKey: { personId: margaret.id, promptKey: "meet" } },
      create: {
        familyId: family.id,
        personId: margaret.id,
        promptKey: "meet",
        question: "How did you meet the person you married?",
        storyId: interviewStory.id,
      },
      update: { storyId: interviewStory.id },
    });
  }

  if (demo) {
    await prisma.personChange.createMany({
      data: [
        {
          id: "change-eleanor-name",
          familyId: family.id,
          personId: eleanor.id,
          actorId: demo.id,
          field: "name",
          before: "Eleanor Whitaker",
          after: "Eleanor Hart",
        },
        {
          id: "change-eleanor-death",
          familyId: family.id,
          personId: eleanor.id,
          actorId: demo.id,
          field: "deathDate",
          before: "2015-06-04",
          after: "2015-06-03",
        },
      ],
      skipDuplicates: true,
    });
  }

  const branchMembers = ["person-eleanor", "person-samuel", "person-margaret", "person-robert", "person-lily"]
    .filter((personId) => people.some((person) => person.id === personId));
  await prisma.familyBranch.upsert({
    where: { id: "branch-cedar-falls-harts" },
    create: {
      id: "branch-cedar-falls-harts",
      familyId: family.id,
      name: "the Cedar Falls Harts",
      summary: "The Iowa line that stayed by the cottonwoods.",
      members: { create: branchMembers.map((personId) => ({ personId })) },
    },
    update: { name: "the Cedar Falls Harts" },
  });

  const cemetery = await prisma.cemetery.upsert({
    where: { id: "cemetery-fairview" },
    create: {
      id: "cemetery-fairview",
      familyId: family.id,
      name: "Fairview Cemetery",
      locality: "Cedar Falls",
      region: "Iowa",
      country: "United States",
      notes: "North of town, past the cottonwoods.",
      latitude: 42.541,
      longitude: -92.448,
    },
    update: { name: "Fairview Cemetery", latitude: 42.541, longitude: -92.448 },
  });
  const existingPlot = await prisma.cemeteryPlot.findFirst({
    where: { cemeteryId: cemetery.id, personId: eleanor.id },
  });
  if (!existingPlot) {
    await prisma.cemeteryPlot.create({
      data: {
        cemeteryId: cemetery.id,
        personId: eleanor.id,
        plot: "Lot 14",
        notes: "Next to the cedar the children planted.",
      },
    });
  }

  const nowPath = writeMedia(
    family.id,
    "grange-now.svg",
    svgScene("Grange hall today", "Cedar Falls, the same doors", "2024", "#6b5344"),
  );
  if (demo) {
    const thenPhoto = await prisma.asset.findFirst({ where: { familyId: family.id, title: "Harvest dance, Grange hall" } });
    let nowPhoto = await prisma.asset.findFirst({ where: { id: "asset-grange-now" } });
    if (!nowPhoto) {
      nowPhoto = await prisma.asset.create({
        data: {
          id: "asset-grange-now",
          familyId: family.id,
          kind: AssetKind.photo,
          title: "Grange hall today",
          mimeType: "image/svg+xml",
          storagePath: nowPath,
          capturedAt: new Date("2024-06-01"),
          uploadedById: demo.id,
        },
      });
    }
    if (thenPhoto) {
      await prisma.photoPair.upsert({
        where: { id: "pair-grange" },
        create: {
          id: "pair-grange",
          familyId: family.id,
          title: "The Grange hall, then and now",
          thenAssetId: thenPhoto.id,
          nowAssetId: nowPhoto.id,
          notes: "The same doors Ellie walked through in 1947.",
        },
        update: { title: "The Grange hall, then and now" },
      });
    }
  }

  if (wei) {
    const voyage = await prisma.voyage.upsert({
      where: { id: "voyage-wei-pacific" },
      create: {
        id: "voyage-wei-pacific",
        familyId: family.id,
        ship: "SS Eastern Star",
        departedFrom: "Hong Kong",
        arrivedAt: "San Francisco",
        departedOn: new Date("1972-03-04"),
        arrivedOn: new Date("1972-03-22"),
        notes: "Wei kept the boarding card in the same envelope as his naturalization papers.",
      },
      update: { ship: "SS Eastern Star" },
    });
    const linked = await prisma.voyagePerson.findUnique({
      where: { voyageId_personId: { voyageId: voyage.id, personId: wei.id } },
    });
    if (!linked) {
      await prisma.voyagePerson.create({ data: { voyageId: voyage.id, personId: wei.id } });
    }
    await prisma.passportRecord.upsert({
      where: { id: "passport-wei" },
      create: {
        id: "passport-wei",
        familyId: family.id,
        personId: wei.id,
        numberNote: "kept with the boarding card",
        issuedOn: new Date("1972-02-10"),
        place: "Hong Kong",
      },
      update: {},
    });
  }

  await prisma.schooling.upsert({
    where: { id: "school-eleanor-cfhs" },
    create: {
      id: "school-eleanor-cfhs",
      familyId: family.id,
      personId: eleanor.id,
      school: "Cedar Falls High",
      place: "Cedar Falls, Iowa",
      startedOn: new Date("1941-09-02"),
      endedOn: new Date("1945-05-28"),
      notes: "She finished in the spring before the last wartime harvest.",
    },
    update: { school: "Cedar Falls High" },
  });

  const reunion = await prisma.reunionGathering.upsert({
    where: { id: "reunion-hart-2026" },
    create: {
      id: "reunion-hart-2026",
      familyId: family.id,
      title: "Hart reunion at the north farm",
      place: "North farm, Cedar Falls",
      happenedOn: new Date("2026-07-04"),
      notes: "Cold chicken under the cottonwoods.",
    },
    update: { title: "Hart reunion at the north farm" },
  });
  for (const personId of ["person-lily", "person-margaret", "person-robert"].filter((id) =>
    people.some((person) => person.id === id),
  )) {
    await prisma.reunionGuest.upsert({
      where: { reunionId_personId: { reunionId: reunion.id, personId } },
      create: { reunionId: reunion.id, personId, coming: true },
      update: { coming: true },
    });
  }

  await prisma.occupationRecord.upsert({
    where: { id: "occ-sam-bees" },
    create: {
      id: "occ-sam-bees",
      familyId: family.id,
      personId: samuel.id,
      title: "Beekeeper",
      employer: "North farm",
      place: "Cedar Falls",
      startedOn: new Date("1988-06-01"),
    },
    update: { title: "Beekeeper" },
  });
  if (margaret) {
    await prisma.godparent.upsert({
      where: { id: "godparent-eleanor-margaret" },
      create: {
        id: "godparent-eleanor-margaret",
        familyId: family.id,
        childId: margaret.id,
        godparentId: eleanor.id,
        notes: "Stood at St. John's.",
      },
      update: {},
    });
  }
  await prisma.congregation.upsert({
    where: { id: "cong-eleanor-stjohns" },
    create: {
      id: "cong-eleanor-stjohns",
      familyId: family.id,
      personId: eleanor.id,
      name: "St. John's",
      place: "Cedar Falls",
      startedOn: new Date("1928-04-08"),
    },
    update: { name: "St. John's" },
  });
  await prisma.landRecord.upsert({
    where: { id: "land-north-farm" },
    create: {
      id: "land-north-farm",
      familyId: family.id,
      personId: samuel.id,
      title: "North farm",
      place: "Cedar Falls, Iowa",
      acquiredOn: new Date("1948-06-14"),
      notes: "The bee yard stayed with the children.",
      abstract: "The north forty stayed with the children after the 1948 deed.",
    },
    update: { title: "North farm", abstract: "The north forty stayed with the children after the 1948 deed." },
  });
  const draftUnit = await prisma.militaryUnit.upsert({
    where: { id: "unit-draft-board" },
    create: {
      id: "unit-draft-board",
      familyId: family.id,
      name: "Black Hawk County draft board",
      branch: "Army",
      place: "Cedar Falls",
      notes: "A week of processing, then home for harvest.",
    },
    update: { name: "Black Hawk County draft board" },
  });
  await prisma.militaryService.upsert({
    where: { id: "mil-samuel-draft" },
    create: {
      id: "mil-samuel-draft",
      familyId: family.id,
      personId: samuel.id,
      unitId: draftUnit.id,
      branch: "County draft board",
      unit: "Black Hawk County draft board",
      startedOn: new Date("1944-09-22"),
      endedOn: new Date("1944-09-29"),
      notes: "A week of processing, then home for harvest.",
    },
    update: { branch: "County draft board", unitId: draftUnit.id, unit: "Black Hawk County draft board" },
  });
  await prisma.bibleRecord.upsert({
    where: { id: "bible-hart" },
    create: {
      id: "bible-hart",
      familyId: family.id,
      title: "Hart family Bible",
      holderId: eleanor.id,
      body: "Married this morning at St. John's. Sam put a sprig of cedar in his buttonhole.",
      recordedAt: new Date("1948-06-14"),
    },
    update: { title: "Hart family Bible" },
  });
  await prisma.familyMotto.upsert({
    where: { id: "motto-cottonwoods" },
    create: {
      id: "motto-cottonwoods",
      familyId: family.id,
      text: "Courtesy to the trees",
      language: "English",
      notes: "Sam said it of the cottonwoods.",
      preferred: true,
    },
    update: { text: "Courtesy to the trees", preferred: true },
  });

  const harvest = await prisma.document.findUnique({ where: { id: "doc-harvest" } });
  if (harvest) {
    await prisma.document.update({
      where: { id: harvest.id },
      data: { translation: HARVEST_TRANSLATION },
    });
    await prisma.chunk.deleteMany({ where: { documentId: harvest.id } });
    await prisma.chunk.createMany({
      data: chunkText(`${harvest.transcript}\n\n${HARVEST_TRANSLATION}`).map((content) => ({
        familyId: family.id,
        documentId: harvest.id,
        personId: eleanor.id,
        content,
      })),
    });
  }

  const ruthReply = await prisma.document.upsert({
    where: { id: "doc-ruth-reply" },
    create: {
      id: "doc-ruth-reply",
      familyId: family.id,
      title: "Ruth to Eleanor, 22 October 1947",
      kind: DocKind.letter,
      transcript: RUTH_REPLY,
      writtenAt: new Date("1947-10-22"),
      replyToId: "doc-harvest",
      needsReview: true,
      people: { create: [{ personId: eleanor.id }] },
    },
    update: { transcript: RUTH_REPLY, replyToId: "doc-harvest", needsReview: true },
  });
  await prisma.chunk.deleteMany({ where: { documentId: ruthReply.id } });
  await prisma.chunk.createMany({
    data: chunkText(RUTH_REPLY).map((content) => ({
      familyId: family.id,
      documentId: ruthReply.id,
      personId: eleanor.id,
      content,
    })),
  });

  if (wei && margaret) {
    const motherLetter = await prisma.document.upsert({
      where: { id: "doc-wei-mother" },
      create: {
        id: "doc-wei-mother",
        familyId: family.id,
        title: "Wei’s mother to Wei, 4 September 1981",
        kind: DocKind.letter,
        transcript: WEI_MOTHER,
        translation: WEI_MOTHER_EN,
        writtenAt: new Date("1981-09-04"),
        people: { create: [{ personId: wei.id }, { personId: margaret.id }] },
      },
      update: { transcript: WEI_MOTHER, translation: WEI_MOTHER_EN },
    });
    await prisma.chunk.deleteMany({ where: { documentId: motherLetter.id } });
    await prisma.chunk.createMany({
      data: chunkText(`${WEI_MOTHER}\n\n${WEI_MOTHER_EN}`).map((content) => ({
        familyId: family.id,
        documentId: motherLetter.id,
        personId: wei.id,
        content,
      })),
    });
  }

  await prisma.custodyRecord.upsert({
    where: { id: "custody-harvest-letter" },
    create: {
      id: "custody-harvest-letter",
      familyId: family.id,
      holderId: margaret?.id ?? eleanor.id,
      title: "Harvest-dance letter",
      kind: "letter",
      documentId: "doc-harvest",
      sinceOn: new Date("2016-03-12"),
      notes: "Folded in Ellie’s cedar chest in the upstairs hall.",
    },
    update: { title: "Harvest-dance letter", notes: "Folded in Ellie’s cedar chest in the upstairs hall." },
  });
  await prisma.custodyRecord.upsert({
    where: { id: "custody-hart-bible" },
    create: {
      id: "custody-hart-bible",
      familyId: family.id,
      holderId: eleanor.id,
      title: "Hart family Bible",
      kind: "Bible",
      notes: "The flyleaf still has the wedding morning.",
      sinceOn: new Date("1948-06-14"),
    },
    update: { title: "Hart family Bible" },
  });

  const business = await prisma.familyBusiness.upsert({
    where: { id: "biz-north-farm-honey" },
    create: {
      id: "biz-north-farm-honey",
      familyId: family.id,
      name: "North farm honey",
      place: "Cedar Falls, Iowa",
      startedOn: new Date("1988-06-01"),
      notes: "Sam would not take a comb until after the harvest-dance anniversary.",
    },
    update: { name: "North farm honey", place: "Cedar Falls, Iowa" },
  });
  await prisma.familyBusinessPerson.upsert({
    where: { businessId_personId: { businessId: business.id, personId: samuel.id } },
    create: { businessId: business.id, personId: samuel.id },
    update: {},
  });
  await prisma.familyBusinessPerson.upsert({
    where: { businessId_personId: { businessId: business.id, personId: eleanor.id } },
    create: { businessId: business.id, personId: eleanor.id },
    update: {},
  });

  await prisma.awardRecord.upsert({
    where: { id: "award-eleanor-pie" },
    create: {
      id: "award-eleanor-pie",
      familyId: family.id,
      personId: eleanor.id,
      title: "County fair pie ribbon",
      awardedOn: new Date("1953-08-14"),
      place: "Cedar Falls",
      notes: "Blue ribbon for the Sunday-roll crust used as a pie lid.",
    },
    update: { title: "County fair pie ribbon" },
  });
  await prisma.clubMembership.upsert({
    where: { id: "club-samuel-grange" },
    create: {
      id: "club-samuel-grange",
      familyId: family.id,
      personId: samuel.id,
      club: "Cedar Falls Grange",
      place: "Cedar Falls",
      startedOn: new Date("1946-01-12"),
      notes: "He was at the harvest dance because he already belonged.",
    },
    update: { club: "Cedar Falls Grange" },
  });
  await prisma.probateRecord.upsert({
    where: { id: "probate-samuel" },
    create: {
      id: "probate-samuel",
      familyId: family.id,
      personId: samuel.id,
      title: "Samuel Hart’s estate",
      happenedOn: new Date("2018-03-02"),
      place: "Cedar Falls",
      notes: "The north farm and the bee yard stay with the children.",
    },
    update: { title: "Samuel Hart’s estate" },
  });
  if (wei) {
    await prisma.naturalizationRecord.upsert({
      where: { id: "nat-wei" },
      create: {
        id: "nat-wei",
        familyId: family.id,
        personId: wei.id,
        court: "Northern District of Iowa",
        place: "Iowa City",
        happenedOn: new Date("1979-05-12"),
      },
      update: { court: "Northern District of Iowa" },
    });
  }
  await prisma.familyAddress.upsert({
    where: { id: "addr-whitaker-house" },
    create: {
      id: "addr-whitaker-house",
      familyId: family.id,
      personId: eleanor.id,
      label: "Whitaker house",
      line: "14 Market Street",
      locality: "Cedar Falls",
      region: "Iowa",
      country: "United States",
      startedOn: new Date("1928-03-12"),
      endedOn: new Date("1948-06-14"),
    },
    update: { line: "14 Market Street" },
  });
  await prisma.apprenticeship.upsert({
    where: { id: "app-samuel-farm" },
    create: {
      id: "app-samuel-farm",
      familyId: family.id,
      personId: samuel.id,
      trade: "Farming",
      master: "Thomas Hart",
      place: "North farm",
      startedOn: new Date("1940-03-01"),
      endedOn: new Date("1944-09-21"),
    },
    update: { trade: "Farming", master: "Thomas Hart" },
  });
  await prisma.newspaperMention.upsert({
    where: { id: "mention-harvest" },
    create: {
      id: "mention-harvest",
      familyId: family.id,
      personId: eleanor.id,
      headline: "Hart and Whitaker at the harvest dance",
      paper: "Cedar Falls Record",
      publishedOn: new Date("1947-10-14"),
      notes: "A line under the Grange social notes.",
    },
    update: { headline: "Hart and Whitaker at the harvest dance" },
  });
  await prisma.familyPet.upsert({
    where: { id: "pet-cider" },
    create: {
      id: "pet-cider",
      familyId: family.id,
      personId: eleanor.id,
      name: "Cider",
      kind: "Barn cat",
      startedOn: new Date("1948-10-18"),
      notes: "Named for the harvest-dance cider. Lived in the cottonwood loft.",
    },
    update: { name: "Cider", kind: "Barn cat" },
  });
  await prisma.textileRecord.upsert({
    where: { id: "quilt-wedding-ring" },
    create: {
      id: "quilt-wedding-ring",
      familyId: family.id,
      makerId: eleanor.id,
      title: "Wedding ring quilt",
      kind: "quilt",
      madeOn: new Date("1948-06-14"),
      notes: "Ellie pieced it the winter after the walk home.",
    },
    update: { title: "Wedding ring quilt" },
  });
  if (wei) {
    await prisma.dnaNote.upsert({
      where: { id: "dna-wei" },
      create: {
        id: "dna-wei",
        familyId: family.id,
        personId: wei.id,
        haplogroup: "O-M175",
        company: "23andMe",
        notes: "Lily wrote it on the back of the 1981 letter.",
      },
      update: { haplogroup: "O-M175" },
    });
  }

  const demoUser = await prisma.user.findUnique({ where: { id: "user-demo" } });
  if (demoUser) {
    const conversation = await prisma.askConversation.upsert({
      where: { id: "ask-harvest-cider" },
      create: {
        id: "ask-harvest-cider",
        familyId: family.id,
        userId: demoUser.id,
        title: "How did grandma meet grandpa?",
        saved: true,
      },
      update: { saved: true, title: "How did grandma meet grandpa?" },
    });
    await prisma.askTurn.deleteMany({ where: { conversationId: conversation.id } });
    const harvestSources = JSON.stringify([
      {
        documentId: "doc-harvest",
        title: "Letter: Eleanor to Ruth, 18 October 1947",
        writtenAt: "1947-10-18",
        kind: "letter",
        excerpt: "The cider was too sweet, and the fiddle ran a little sharp.",
      },
    ]);
    await prisma.askTurn.createMany({
      data: [
        { conversationId: conversation.id, role: "user", text: "How did grandma meet grandpa?" },
        { conversationId: conversation.id, role: "assistant", text: HART_ASK_ANSWER, sourcesJson: harvestSources },
        { conversationId: conversation.id, role: "user", text: "What did she say about the cider?" },
        { conversationId: conversation.id, role: "assistant", text: HART_ASK_FOLLOW, sourcesJson: harvestSources },
      ],
    });
  }

  const photos = await prisma.asset.findMany({
    where: {
      familyId: family.id,
      title: { in: ["Harvest dance, Grange hall", "Ellie and Sam married", "Hart picnic, 1961"] },
    },
  });
  if (photos.length && demoUser) {
    const album = await prisma.album.upsert({
      where: { id: "album-harvest" },
      create: {
        id: "album-harvest",
        familyId: family.id,
        title: "Harvest years",
        summary: "The dance, the wedding, and the picnic under the cottonwoods.",
        createdById: demoUser.id,
      },
      update: { title: "Harvest years" },
    });
    for (const photo of photos) {
      const existing = await prisma.albumItem.findFirst({ where: { albumId: album.id, assetId: photo.id } });
      if (!existing) {
        await prisma.albumItem.create({ data: { albumId: album.id, assetId: photo.id } });
      }
    }
  }

  const heirloom = await prisma.heirloom.upsert({
    where: { id: "heirloom-cedar-chest" },
    create: {
      id: "heirloom-cedar-chest",
      familyId: family.id,
      personId: eleanor.id,
      title: "Ellie’s cedar chest",
      summary: "The harvest-dance letter still lives in the tray.",
      acquiredAt: new Date("1948-06-14"),
    },
    update: { title: "Ellie’s cedar chest" },
  });
  if (lily) {
    await prisma.heirloomLoan.upsert({
      where: { id: "loan-lily-chest" },
      create: {
        id: "loan-lily-chest",
        familyId: family.id,
        heirloomId: heirloom.id,
        borrowerId: lily.id,
        borrowedOn: new Date("2026-06-01"),
        dueOn: new Date("2026-10-12"),
        notes: "For the reunion display, then back to Meg’s hall.",
      },
      update: { dueOn: new Date("2026-10-12") },
    });
  }

  const home = await prisma.familyHome.upsert({
    where: { id: "home-whitaker" },
    create: {
      id: "home-whitaker",
      familyId: family.id,
      title: "Whitaker house",
      line: "14 Market Street",
      locality: "Cedar Falls",
      region: "Iowa",
      notes: "Ellie wrote from the upstairs hall.",
    },
    update: { title: "Whitaker house", line: "14 Market Street" },
  });
  for (const person of [eleanor, samuel, margaret].filter(Boolean)) {
    if (!person) continue;
    await prisma.familyHomeResident.upsert({
      where: { homeId_personId: { homeId: home.id, personId: person.id } },
      create: {
        homeId: home.id,
        personId: person.id,
        startedOn: person.id === eleanor.id ? new Date("1928-03-12") : new Date("1948-06-14"),
      },
      update: {},
    });
  }
  const housePhotos = photos.length
    ? photos
    : await prisma.asset.findMany({
        where: {
          familyId: family.id,
          title: { in: ["Harvest dance, Grange hall", "Ellie and Sam married", "Hart picnic, 1961"] },
        },
      });
  for (const photo of housePhotos) {
    const existing = await prisma.familyHomePhoto.findFirst({ where: { homeId: home.id, assetId: photo.id } });
    if (!existing) {
      await prisma.familyHomePhoto.create({
        data: {
          homeId: home.id,
          assetId: photo.id,
          takenOn: photo.capturedAt,
          caption: photo.title,
        },
      });
    }
  }

  await prisma.digitizeItem.upsert({
    where: { id: "digitize-ruth-chest" },
    create: {
      id: "digitize-ruth-chest",
      familyId: family.id,
      title: "Ruth’s reply, still in the cedar chest",
      kind: "letter",
      holderId: margaret?.id ?? eleanor.id,
      notes: "The second page has no scan yet.",
    },
    update: { title: "Ruth’s reply, still in the cedar chest" },
  });

  await prisma.pinnedMemory.upsert({
    where: { id: "pin-harvest-letter" },
    create: {
      id: "pin-harvest-letter",
      familyId: family.id,
      title: "The harvest-dance letter",
      note: "How Grandma met Grandpa, pinned on the family home.",
      documentId: "doc-harvest",
    },
    update: { title: "The harvest-dance letter" },
  });

  const picnic = housePhotos.find((photo) => /picnic/i.test(photo.title || ""));
  if (picnic) {
    await prisma.reunionPhoto.upsert({
      where: { reunionId_assetId: { reunionId: "reunion-hart-2026", assetId: picnic.id } },
      create: { reunionId: "reunion-hart-2026", assetId: picnic.id },
      update: {},
    });
  }

  await prisma.handwritingSample.upsert({
    where: { id: "handwriting-eleanor" },
    create: {
      id: "handwriting-eleanor",
      familyId: family.id,
      personId: eleanor.id,
      documentId: "doc-harvest",
      notes: "The long loops on cider and cottonwood.",
    },
    update: { notes: "The long loops on cider and cottonwood." },
  });

  await prisma.gravestoneInscription.upsert({
    where: { id: "inscription-eleanor" },
    create: {
      id: "inscription-eleanor",
      familyId: family.id,
      personId: eleanor.id,
      text: "At rest under the cottonwoods",
      place: "Fairview Cemetery",
    },
    update: { text: "At rest under the cottonwoods" },
  });

  await prisma.familyHoliday.upsert({
    where: { id: "holiday-harvest" },
    create: {
      id: "holiday-harvest",
      familyId: family.id,
      title: "Harvest-dance anniversary supper",
      season: "October",
      notes: "Sunday rolls and cider.",
    },
    update: { title: "Harvest-dance anniversary supper" },
  });

  const dancePhoto = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Harvest dance, Grange hall" },
  });
  if (dancePhoto) {
    await prisma.asset.update({ where: { id: dancePhoto.id }, data: { placeId: grange.id } });
  }
  const picnicPhoto = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Hart picnic, 1961" },
  });
  if (picnicPhoto) {
    await prisma.asset.update({ where: { id: picnicPhoto.id }, data: { placeId: northFarm.id } });
  }

  const picnicReel = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Picnic home movie, 1961" },
  });
  if (picnicReel) {
    const reelDoc = await prisma.document.upsert({
      where: { id: "doc-picnic-reel" },
      create: {
        id: "doc-picnic-reel",
        familyId: family.id,
        assetId: picnicReel.id,
        title: "Picnic reel, Helen speaking",
        kind: DocKind.note,
        transcript: PICNIC_TRANSCRIPT,
        writtenAt: picnicReel.capturedAt,
        people: margaret ? { create: [{ personId: margaret.id }] } : undefined,
      },
      update: { transcript: PICNIC_TRANSCRIPT, title: "Picnic reel, Helen speaking" },
    });
    await prisma.chunk.deleteMany({ where: { documentId: reelDoc.id } });
    await prisma.chunk.createMany({
      data: chunkText(PICNIC_TRANSCRIPT).map((content) => ({
        familyId: family.id,
        documentId: reelDoc.id,
        personId: margaret?.id ?? eleanor.id,
        content,
      })),
    });
  }

  if (demoUser) {
    await prisma.comment.upsert({
      where: { id: "guestbook-eleanor" },
      create: {
        id: "guestbook-eleanor",
        familyId: family.id,
        authorId: demoUser.id,
        personId: eleanor.id,
        body: "I still make her Sunday rolls the night before the harvest-dance anniversary.",
      },
      update: { body: "I still make her Sunday rolls the night before the harvest-dance anniversary." },
    });
  }

  await prisma.citation.upsert({
    where: { id: "cite-eleanor-census" },
    create: {
      id: "cite-eleanor-census",
      familyId: family.id,
      personId: eleanor.id,
      eventId: "event-eleanor-census",
      documentId: "doc-harvest",
      kind: "census",
      claim: "Eleanor Hart was counted in 1950 at Cedar Falls.",
      pageNote: "1950 census, Cedar Falls, ED 7-12",
    },
    update: { kind: "census", claim: "Eleanor Hart was counted in 1950 at Cedar Falls." },
  });
  await prisma.citation.upsert({
    where: { id: "cite-eleanor-birth" },
    create: {
      id: "cite-eleanor-birth",
      familyId: family.id,
      personId: eleanor.id,
      eventId: "event-person-eleanor-birth",
      documentId: "doc-harvest",
      kind: "birth",
      claim: "Eleanor Hart was born in 1928 at Cedar Falls.",
      pageNote: "Birth 1928, Cedar Falls",
    },
    update: { kind: "birth" },
  });
  await prisma.citation.upsert({
    where: { id: "cite-eleanor-death" },
    create: {
      id: "cite-eleanor-death",
      familyId: family.id,
      personId: eleanor.id,
      eventId: "event-person-eleanor-death",
      documentId: "doc-harvest",
      kind: "death",
      claim: "Eleanor Hart died in 2015 at Cedar Falls.",
      pageNote: "Death 2015, Cedar Falls",
    },
    update: { kind: "death" },
  });

  await prisma.person.update({
    where: { id: eleanor.id },
    data: { pronunciation: "EL-uh-nor hart" },
  });
  const lilyForChild = await prisma.person.findUnique({ where: { id: "person-lily" } });
  if (lilyForChild) {
    const nora = await prisma.person.upsert({
      where: { id: "person-nora" },
      create: {
        id: "person-nora",
        familyId: family.id,
        displayName: "Nora Chen",
        givenName: "Nora",
        familyName: "Chen",
        birthDate: new Date("2018-06-14"),
        notes: "Lily’s daughter. Keep her photographs off share links.",
      },
      update: { birthDate: new Date("2018-06-14") },
    });
    const alreadyChild = await prisma.relationship.findFirst({
      where: { familyId: family.id, fromPersonId: lilyForChild.id, toPersonId: nora.id, type: RelType.parent },
    });
    if (!alreadyChild) {
      await prisma.relationship.create({
        data: { familyId: family.id, type: RelType.parent, fromPersonId: lilyForChild.id, toPersonId: nora.id },
      });
    }
  }
  await prisma.document.upsert({
    where: { id: "doc-sunday-rolls" },
    create: {
      id: "doc-sunday-rolls",
      familyId: family.id,
      title: "Sunday rolls",
      kind: DocKind.recipe,
      transcript: "Warm milk, a cake of yeast, and the navy-blue bowl. Bake them the night before the harvest-dance anniversary.",
      writtenAt: new Date("1961-07-02"),
      people: { create: [{ personId: eleanor.id }] },
    },
    update: { title: "Sunday rolls" },
  });
  await prisma.reunionDish.upsert({
    where: { id: "dish-sunday-rolls" },
    create: {
      id: "dish-sunday-rolls",
      familyId: family.id,
      reunionId: "reunion-hart-2026",
      personId: "person-margaret",
      recipeId: "doc-sunday-rolls",
      title: "Sunday rolls",
      notes: "Warm, in the navy-blue bowl",
    },
    update: { title: "Sunday rolls", recipeId: "doc-sunday-rolls" },
  });
  await prisma.citation.updateMany({
    where: { id: "cite-marriage" },
    data: { quality: "original" },
  });
  await prisma.personTag.updateMany({
    where: { personId: "person-eleanor", x: null },
    data: { x: 48, y: 42 },
  });

  await prisma.person.update({
    where: { id: eleanor.id },
    data: { ownerNote: "The cedar chest key is in the upstairs desk. Do not put this on the memorial." },
  });
  await prisma.lifeChapter.upsert({
    where: { id: "chapter-eleanor-childhood" },
    create: {
      id: "chapter-eleanor-childhood",
      familyId: family.id,
      personId: eleanor.id,
      kind: "childhood",
      title: "Childhood",
      startedOn: new Date("1928-03-12"),
      endedOn: new Date("1946-03-12"),
      notes: "Market Street and St. John's.",
    },
    update: { title: "Childhood" },
  });
  await prisma.lifeChapter.upsert({
    where: { id: "chapter-eleanor-work" },
    create: {
      id: "chapter-eleanor-work",
      familyId: family.id,
      personId: eleanor.id,
      kind: "work",
      title: "Work years",
      startedOn: new Date("1946-03-12"),
      endedOn: new Date("1993-03-12"),
      notes: "The millinery counter, then the farm kitchen.",
    },
    update: { title: "Work years" },
  });
  await prisma.lifeChapter.upsert({
    where: { id: "chapter-eleanor-later" },
    create: {
      id: "chapter-eleanor-later",
      familyId: family.id,
      personId: eleanor.id,
      kind: "later",
      title: "Later years",
      startedOn: new Date("1993-03-12"),
      endedOn: new Date("2015-06-03"),
      notes: "Sunday rolls and the grandchildren.",
    },
    update: { title: "Later years" },
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-eleanor-baptism" },
    create: {
      id: "event-eleanor-baptism",
      familyId: family.id,
      personId: eleanor.id,
      kind: EventKind.baptism,
      title: "Eleanor baptized at St. John's",
      happenedOn: new Date("1928-04-08"),
    },
    update: { title: "Eleanor baptized at St. John's" },
  });
  const northHome = await prisma.familyHome.upsert({
    where: { id: "home-north-farm" },
    create: {
      id: "home-north-farm",
      familyId: family.id,
      title: "North farm house",
      line: "North of the cottonwoods",
      locality: "Cedar Falls",
      region: "Iowa",
      notes: "The bee yard stayed with the children.",
    },
    update: { title: "North farm house" },
  });
  await prisma.landRecord.update({
    where: { id: "land-north-farm" },
    data: { homeId: northHome.id, abstract: "The north forty stayed with the children after the 1948 deed." },
  });
  await prisma.familyFarm.upsert({
    where: { id: "farm-north" },
    create: {
      id: "farm-north",
      familyId: family.id,
      homeId: northHome.id,
      title: "North farm",
      place: "Cedar Falls, Iowa",
      startedOn: new Date("1948-06-14"),
      notes: "Sam kept the bees after he stopped farming.",
    },
    update: { homeId: northHome.id },
  });
  await prisma.familyHymn.upsert({
    where: { id: "hymn-abide" },
    create: {
      id: "hymn-abide",
      familyId: family.id,
      title: "Abide with Me",
      verse: "Fast falls the eventide.",
      occasion: "Funerals at Fairview",
    },
    update: { title: "Abide with Me" },
  });
  const picnicFilm = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Picnic home movie, 1961" },
  });
  if (picnicFilm) {
    const existingMoment = await prisma.filmMoment.findFirst({
      where: { assetId: picnicFilm.id, title: "Mother cuts the Sunday rolls" },
    });
    if (!existingMoment) {
      await prisma.filmMoment.create({
        data: {
          id: "moment-sunday-rolls",
          familyId: family.id,
          assetId: picnicFilm.id,
          seconds: 83,
          title: "Mother cuts the Sunday rolls",
          notes: "Under the cottonwoods, July 1961.",
        },
      });
    }
  }

  const household1940 = await prisma.censusHousehold.upsert({
    where: { id: "household-hart-1940" },
    create: {
      id: "household-hart-1940",
      familyId: family.id,
      year: 1940,
      place: "Cedar Falls",
      street: "Whitaker house",
      groupKey: "hart-cedar-falls",
      notes: "Eleanor still at home before the harvest dance.",
    },
    update: { place: "Cedar Falls", street: "Whitaker house" },
  });
  const household1950 = await prisma.censusHousehold.upsert({
    where: { id: "household-hart-1950" },
    create: {
      id: "household-hart-1950",
      familyId: family.id,
      year: 1950,
      place: "Cedar Falls",
      street: "North farm",
      groupKey: "hart-cedar-falls",
      notes: "The same family after Ellie married Sam.",
    },
    update: { place: "Cedar Falls", street: "North farm" },
  });
  await prisma.censusHouseholdPerson.upsert({
    where: { householdId_personId: { householdId: household1940.id, personId: eleanor.id } },
    create: { householdId: household1940.id, personId: eleanor.id, role: "daughter", age: 12 },
    update: { role: "daughter", age: 12 },
  });
  await prisma.censusHouseholdPerson.upsert({
    where: { householdId_personId: { householdId: household1950.id, personId: eleanor.id } },
    create: { householdId: household1950.id, personId: eleanor.id, role: "wife", age: 22, occupation: "keeping house" },
    update: { role: "wife", age: 22, occupation: "keeping house" },
  });
  await prisma.censusHouseholdPerson.upsert({
    where: { householdId_personId: { householdId: household1950.id, personId: samuel.id } },
    create: { householdId: household1950.id, personId: samuel.id, role: "head", age: 23, occupation: "farmer" },
    update: { role: "head", age: 23, occupation: "farmer" },
  });

  const register = await prisma.churchRegister.upsert({
    where: { id: "register-st-johns" },
    create: {
      id: "register-st-johns",
      familyId: family.id,
      church: "St. John's",
      place: "Cedar Falls, Iowa",
      startedOn: new Date("1920-01-01"),
      endedOn: new Date("2016-01-01"),
      notes: "Parish book used for Hart baptisms, marriages, and burials.",
    },
    update: { church: "St. John's" },
  });
  await prisma.churchRegisterLine.upsert({
    where: { id: "register-eleanor-baptism" },
    create: {
      id: "register-eleanor-baptism",
      registerId: register.id,
      kind: "baptism",
      happenedOn: new Date("1928-04-12"),
      text: "Eleanor Whitaker, daughter of the house, baptised at St. John's.",
      personId: eleanor.id,
    },
    update: { text: "Eleanor Whitaker, daughter of the house, baptised at St. John's." },
  });
  await prisma.churchRegisterLine.upsert({
    where: { id: "register-hart-marriage" },
    create: {
      id: "register-hart-marriage",
      registerId: register.id,
      kind: "marriage",
      happenedOn: new Date("1948-06-14"),
      text: "Samuel Hart and Eleanor Whitaker married, then cold chicken under the cottonwoods.",
      personId: eleanor.id,
      otherPersonId: samuel.id,
    },
    update: { text: "Samuel Hart and Eleanor Whitaker married, then cold chicken under the cottonwoods." },
  });
  await prisma.churchRegisterLine.upsert({
    where: { id: "register-eleanor-burial" },
    create: {
      id: "register-eleanor-burial",
      registerId: register.id,
      kind: "burial",
      happenedOn: new Date("2015-06-06"),
      text: "Eleanor Hart buried at Fairview, plot near the cedar.",
      personId: eleanor.id,
    },
    update: { text: "Eleanor Hart buried at Fairview, plot near the cedar." },
  });

  const tax1950 = await prisma.taxList.upsert({
    where: { id: "tax-cedar-falls-1950" },
    create: {
      id: "tax-cedar-falls-1950",
      familyId: family.id,
      place: "Cedar Falls",
      year: 1950,
      notes: "County assessor, north of town.",
    },
    update: { place: "Cedar Falls", year: 1950 },
  });
  const existingTax = await prisma.taxListName.findFirst({
    where: { listId: tax1950.id, name: "Samuel Hart" },
  });
  if (!existingTax) {
    await prisma.taxListName.create({
      data: { id: "tax-samuel-1950", listId: tax1950.id, personId: samuel.id, name: "Samuel Hart", amount: "$42.00", notes: "North farm" },
    });
  }

  if (wei) {
    await prisma.voyagePerson.updateMany({
      where: { voyageId: "voyage-wei-pacific", personId: wei.id },
      data: { age: 21, role: "passenger", notes: "Boarding card kept with the naturalization papers." },
    });
  }

  const picnicScan =
    picnicPhoto || (await prisma.asset.findFirst({ where: { familyId: family.id, title: "Hart picnic, 1961" } }));
  const harvestScan = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Harvest dance, Grange hall" },
  });
  if (picnicScan) {
    await prisma.censusHousehold.update({
      where: { id: household1940.id },
      data: { assetId: picnicScan.id },
    });
  }
  if (harvestScan) {
    await prisma.censusHousehold.update({
      where: { id: household1950.id },
      data: { assetId: harvestScan.id },
    });
  }
  if (wei && (picnicScan || harvestScan)) {
    await prisma.voyage.update({
      where: { id: "voyage-wei-pacific" },
      data: { assetId: picnicScan?.id ?? harvestScan?.id },
    });
  }
  await prisma.family.update({
    where: { id: family.id },
    data: { calendarToken: family.calendarToken || "hart-family-dates" },
  });
  if (demoUser) {
    await prisma.journalEntry.upsert({
      where: { id: "journal-lily-cider" },
      create: {
        id: "journal-lily-cider",
        familyId: family.id,
        authorId: demoUser.id,
        title: "What I still remember of Grandma's cider",
        body: "She said the cider was too sweet. I have not shared this with the cousins yet.",
        recordedAt: new Date("2026-03-12"),
        keepOutOfAsk: true,
      },
      update: { title: "What I still remember of Grandma's cider", keepOutOfAsk: true },
    });
    await prisma.personBookmark.upsert({
      where: { userId_personId: { userId: demoUser.id, personId: eleanor.id } },
      create: { userId: demoUser.id, personId: eleanor.id },
      update: {},
    });
    const lilyBookmark = await prisma.person.findUnique({ where: { id: "person-lily" } });
    if (lilyBookmark) {
      await prisma.personBookmark.upsert({
        where: { userId_personId: { userId: demoUser.id, personId: lilyBookmark.id } },
        create: { userId: demoUser.id, personId: lilyBookmark.id },
        update: {},
      });
    }
    await prisma.personFollow.upsert({
      where: { userId_personId: { userId: demoUser.id, personId: eleanor.id } },
      create: { userId: demoUser.id, personId: eleanor.id },
      update: {},
    });
    await prisma.invite.upsert({
      where: { token: "hart-researcher-2026" },
      create: {
        familyId: family.id,
        token: "hart-researcher-2026",
        email: "archives@cedarfalls.lib",
        role: Role.viewer,
        purpose: "researcher",
        expiresAt: new Date("2026-12-31T23:59:59.999Z"),
      },
      update: {
        purpose: "researcher",
        role: Role.viewer,
        expiresAt: new Date("2026-12-31T23:59:59.999Z"),
        email: "archives@cedarfalls.lib",
      },
    });
    const newspaperPath = writeMedia(
      family.id,
      "fairview-clipping.svg",
      svgScene("Fairview notice", "Cedar Falls Courier", "4 June 2015", "#3d3228"),
    );
    let clippingAsset = await prisma.asset.findFirst({
      where: { familyId: family.id, title: "Fairview burial notice, newspaper page" },
    });
    if (!clippingAsset) {
      clippingAsset = await prisma.asset.create({
        data: {
          familyId: family.id,
          kind: AssetKind.letter,
          title: "Fairview burial notice, newspaper page",
          mimeType: "image/svg+xml",
          storagePath: newspaperPath,
          capturedAt: new Date("2015-06-04"),
          uploadedById: demoUser.id,
          tags: { create: [{ personId: eleanor.id }] },
        },
      });
    }
    await prisma.document.upsert({
      where: { id: "doc-clipping-fairview" },
      create: {
        id: "doc-clipping-fairview",
        familyId: family.id,
        assetId: clippingAsset.id,
        title: "Fairview burial notice",
        kind: DocKind.clipping,
        transcript: "Eleanor Hart, called Ellie, was laid to rest at Fairview near the cedar.",
        writtenAt: new Date("2015-06-04"),
        people: { create: [{ personId: eleanor.id }] },
      },
      update: { title: "Fairview burial notice", assetId: clippingAsset.id },
    });
    const existingSuggest = await prisma.factSuggestion.findFirst({
      where: { id: "suggest-eleanor-plot" },
    });
    if (!existingSuggest) {
      await prisma.factSuggestion.create({
        data: {
          id: "suggest-eleanor-plot",
          familyId: family.id,
          createdById: demoUser.id,
          personId: eleanor.id,
          entityType: "person",
          entityId: eleanor.id,
          field: "burialPlot",
          currentValue: eleanor.burialPlot,
          proposedValue: "Fairview, plot near the cedar",
          note: "The parish book says the plot by the cedar.",
        },
      });
    }
    const unsortedPath = writeMedia(
      family.id,
      "unsorted-harvest-program.svg",
      svgScene("Harvest program", "Still in the box", "1947", "#4a3a2a"),
    );
    let unsorted = await prisma.asset.findFirst({
      where: { familyId: family.id, title: "Harvest program still in the box" },
    });
    if (!unsorted) {
      unsorted = await prisma.asset.create({
        data: {
          id: "asset-unsorted-program",
          familyId: family.id,
          kind: AssetKind.photo,
          title: "Harvest program still in the box",
          mimeType: "image/svg+xml",
          storagePath: unsortedPath,
          capturedAt: new Date("1947-10-18"),
          uploadedById: demoUser.id,
        },
      });
    }
    const deedPath = writeMedia(
      family.id,
      "north-farm-deed.svg",
      svgScene("North farm deed", "The north forty", "1948", "#2f3d2e"),
    );
    let deedAsset = await prisma.asset.findFirst({
      where: { familyId: family.id, title: "North farm deed, 1948" },
    });
    if (!deedAsset) {
      deedAsset = await prisma.asset.create({
        data: {
          id: "asset-north-farm-deed",
          familyId: family.id,
          kind: AssetKind.letter,
          title: "North farm deed, 1948",
          mimeType: "image/svg+xml",
          storagePath: deedPath,
          capturedAt: new Date("1948-06-14"),
          uploadedById: demoUser.id,
        },
      });
    }
    await prisma.landRecord.update({
      where: { id: "land-north-farm" },
      data: { assetId: deedAsset.id },
    });
    const chest = await prisma.heirloom.findUnique({ where: { id: "heirloom-cedar-chest" } });
    if (chest && margaret && lily) {
      for (const hold of [
        {
          id: "hold-chest-eleanor",
          personId: eleanor.id,
          heldFrom: new Date("1948-06-14"),
          heldUntil: new Date("1995-09-01"),
          note: "Ellie kept the harvest letter in the tray.",
        },
        {
          id: "hold-chest-margaret",
          personId: margaret.id,
          heldFrom: new Date("1995-09-01"),
          heldUntil: new Date("2024-06-01"),
          note: "Meg kept it in the upstairs hall.",
        },
        {
          id: "hold-chest-lily",
          personId: lily.id,
          heldFrom: new Date("2024-06-01"),
          heldUntil: null,
          note: "Lily has it for the reunion display.",
        },
      ]) {
        await prisma.heirloomHold.upsert({
          where: { id: hold.id },
          create: { ...hold, heirloomId: chest.id },
          update: { heldFrom: hold.heldFrom, heldUntil: hold.heldUntil, note: hold.note },
        });
      }
    }
    const harvestLetter = await prisma.document.findUnique({ where: { id: "doc-harvest" } });
    if (harvestLetter) {
      await prisma.document.update({
        where: { id: "doc-harvest" },
        data: {
          transcribedById: demoUser.id,
          transcriptLockedAt: new Date("2026-03-01"),
        },
      });
    }
    if (samuel) {
      await prisma.personFollow.upsert({
        where: { userId_personId: { userId: demoUser.id, personId: samuel.id } },
        create: { userId: demoUser.id, personId: samuel.id, mutedAt: new Date("2026-04-01") },
        update: { mutedAt: new Date("2026-04-01") },
      });
    }
    const meetingPeople = [eleanor.id, lily?.id, margaret?.id].filter(Boolean) as string[];
    await prisma.familyMeeting.upsert({
      where: { id: "meeting-harvest-planning" },
      create: {
        id: "meeting-harvest-planning",
        familyId: family.id,
        title: "Harvest planning at Meg's",
        happenedOn: new Date("2026-03-20"),
        notes: "Bring the cedar chest to the reunion. Lily will file the leftover program once we know whose lap it sat on.",
        createdById: demoUser.id,
        attendees: { create: meetingPeople.map((personId) => ({ personId })) },
      },
      update: {
        notes: "Bring the cedar chest to the reunion. Lily will file the leftover program once we know whose lap it sat on.",
      },
    });
  }

  if (demoUser) {
    await prisma.savedSearch.upsert({
      where: { id: "search-harvest-dance" },
      create: {
        id: "search-harvest-dance",
        familyId: family.id,
        userId: demoUser.id,
        title: "harvest dance",
        query: "harvest dance",
        href: "/search?q=harvest+dance",
      },
      update: { query: "harvest dance" },
    });
  }

  const picnicForNote = picnicPhoto || (await prisma.asset.findFirst({ where: { familyId: family.id, title: "Hart picnic, 1961" } }));
  if (picnicForNote) {
    const existingNote = await prisma.photoNote.findFirst({
      where: { assetId: picnicForNote.id, text: "Mother cuts the Sunday rolls" },
    });
    if (!existingNote) {
      await prisma.photoNote.create({
        data: {
          id: "note-sunday-rolls",
          familyId: family.id,
          assetId: picnicForNote.id,
          text: "Mother cuts the Sunday rolls",
          x: 42,
          y: 28,
        },
      });
    }
  }

  await prisma.family.update({
    where: { id: family.id },
    data: { nameStyle: "given-family", dateStyle: "day-month-year" },
  });
  if (samuel) {
    await prisma.occupationRecord.upsert({
      where: { id: "occ-sam-farmer" },
      create: {
        id: "occ-sam-farmer",
        familyId: family.id,
        personId: samuel.id,
        title: "Farmer",
        employer: "North farm",
        place: "Cedar Falls",
        startedOn: new Date("1948-06-14"),
        endedOn: new Date("1987-11-01"),
      },
      update: { title: "Farmer" },
    });
  }
  await prisma.occupationRecord.upsert({
    where: { id: "occ-eleanor-millinery" },
    create: {
      id: "occ-eleanor-millinery",
      familyId: family.id,
      personId: eleanor.id,
      title: "Milliner",
      employer: "Market Street counter",
      place: "Cedar Falls",
      startedOn: new Date("1946-03-01"),
      endedOn: new Date("1952-06-01"),
    },
    update: { title: "Milliner" },
  });
  if (margaret) {
    await prisma.schooling.upsert({
      where: { id: "school-margaret-ui" },
      create: {
        id: "school-margaret-ui",
        familyId: family.id,
        personId: margaret.id,
        school: "University of Iowa",
        place: "Iowa City",
        startedOn: new Date("1970-09-01"),
        endedOn: new Date("1974-05-15"),
        notes: "She trained as a teacher.",
      },
      update: { school: "University of Iowa" },
    });
  }
  if (demoUser) {
    await prisma.documentRevision.upsert({
      where: { id: "rev-harvest-first-pass" },
      create: {
        id: "rev-harvest-first-pass",
        documentId: "doc-harvest",
        transcript: "Sam — the dance was last Saturday. I will write more later.\n\nEllie",
        editedById: demoUser.id,
        editedAt: new Date("2026-02-14"),
      },
      update: {},
    });
    for (const item of [
      { id: "asset-unsorted-ticket", file: "unsorted-ticket.svg", title: "Harvest dance ticket still in the box", year: "1947" },
      { id: "asset-unsorted-ribbon", file: "unsorted-ribbon.svg", title: "Prize ribbon still in the box", year: "1948" },
    ]) {
      const existing = await prisma.asset.findFirst({ where: { id: item.id } });
      if (!existing) {
        const path = writeMedia(family.id, item.file, svgScene(item.title, "Still in the box", item.year, "#4a3a2a"));
        await prisma.asset.create({
          data: {
            id: item.id,
            familyId: family.id,
            kind: AssetKind.photo,
            title: item.title,
            mimeType: "image/svg+xml",
            storagePath: path,
            capturedAt: new Date(`${item.year}-10-18`),
            uploadedById: demoUser.id,
          },
        });
      }
    }
  }
  if (picnicForNote && demoUser) {
    let cleaned = await prisma.asset.findFirst({ where: { id: "asset-picnic-cleaned" } });
    if (!cleaned) {
      const cleanedPath = writeMedia(
        family.id,
        "picnic-cleaned.svg",
        svgScene("Hart picnic, cleaned", "Sunday rolls under the cottonwoods", "1961", "#5c4634"),
      );
      cleaned = await prisma.asset.create({
        data: {
          id: "asset-picnic-cleaned",
          familyId: family.id,
          kind: AssetKind.photo,
          title: "Hart picnic, 1961 — cleaned",
          mimeType: "image/svg+xml",
          storagePath: cleanedPath,
          capturedAt: new Date("1961-07-04"),
          uploadedById: demoUser.id,
        },
      });
    }
    await prisma.photoRestore.upsert({
      where: { id: "restore-picnic-1961" },
      create: {
        id: "restore-picnic-1961",
        familyId: family.id,
        title: "Hart picnic, 1961",
        originalId: picnicForNote.id,
        cleanedId: cleaned.id,
        notes: "The scan was faded; Lily cleaned the cottonwoods and the Sunday rolls.",
      },
      update: { title: "Hart picnic, 1961" },
    });
  }

  const eleanorPlot = await prisma.cemeteryPlot.findFirst({
    where: { cemeteryId: "cemetery-fairview", personId: eleanor.id },
  });
  if (eleanorPlot) {
    await prisma.cemeteryPlot.update({
      where: { id: eleanorPlot.id },
      data: { x: 42, y: 38, plot: "Lot 14" },
    });
  }
  const samuelPlot = await prisma.cemeteryPlot.findFirst({
    where: { cemeteryId: "cemetery-fairview", personId: samuel.id },
  });
  if (!samuelPlot) {
    await prisma.cemeteryPlot.create({
      data: {
        cemeteryId: "cemetery-fairview",
        personId: samuel.id,
        plot: "Lot 15",
        notes: "Beside Eleanor, facing the cottonwoods.",
        x: 58,
        y: 38,
      },
    });
  } else {
    await prisma.cemeteryPlot.update({
      where: { id: samuelPlot.id },
      data: { x: 58, y: 38, plot: "Lot 15" },
    });
  }

  if (samuel) {
    await prisma.occupationRecord.upsert({
      where: { id: "occ-sam-fair-judge" },
      create: {
        id: "occ-sam-fair-judge",
        familyId: family.id,
        personId: samuel.id,
        title: "County fair judge",
        employer: "Black Hawk County fair",
        place: "Cedar Falls",
        startedOn: new Date("1985-08-01"),
        endedOn: new Date("1992-08-15"),
      },
      update: { title: "County fair judge" },
    });
  }

  const picnicBring = picnicForNote || (await prisma.asset.findFirst({ where: { familyId: family.id, title: "Hart picnic, 1961" } }));
  const lilyBring = people.find((person) => person.id === "person-lily");
  if (picnicBring && lilyBring) {
    await prisma.reunionBring.upsert({
      where: { id: "bring-picnic-photo" },
      create: {
        id: "bring-picnic-photo",
        familyId: family.id,
        reunionId: "reunion-hart-2026",
        personId: lilyBring.id,
        kind: "photo",
        title: "Hart picnic, 1961",
        assetId: picnicBring.id,
        notes: "The reel still has Mother cutting Sunday rolls.",
      },
      update: { title: "Hart picnic, 1961", assetId: picnicBring.id },
    });
  }
  if (margaret) {
    await prisma.reunionBring.upsert({
      where: { id: "bring-cedar-chest" },
      create: {
        id: "bring-cedar-chest",
        familyId: family.id,
        reunionId: "reunion-hart-2026",
        personId: margaret.id,
        kind: "heirloom",
        title: "Ellie's cedar chest",
        heirloomId: "heirloom-cedar-chest",
        notes: "The harvest-dance letter is still in the tray.",
      },
      update: { title: "Ellie's cedar chest" },
    });
  }

  if (demoUser) {
    let biblePage = await prisma.asset.findFirst({ where: { id: "asset-bible-hart-page" } });
    if (!biblePage) {
      const path = writeMedia(
        family.id,
        "bible-page.svg",
        svgScene("Hart family Bible", "Married this morning at St. John's", "14 June 1948", "#5c3a2a"),
      );
      biblePage = await prisma.asset.create({
        data: {
          id: "asset-bible-hart-page",
          familyId: family.id,
          kind: AssetKind.photo,
          title: "Hart family Bible flyleaf",
          mimeType: "image/svg+xml",
          storagePath: path,
          capturedAt: new Date("1948-06-14"),
          uploadedById: demoUser.id,
        },
      });
    }
    await prisma.bibleRecord.update({
      where: { id: "bible-hart" },
      data: { assetId: biblePage.id },
    });
  }

  await prisma.document.update({
    where: { id: "doc-eleanor-obit" },
    data: { memorialPersonId: eleanor.id },
  });

  if (demoUser && harvest) {
    const askStory = await prisma.story.upsert({
      where: { id: "story-ask-harvest" },
      create: {
        id: "story-ask-harvest",
        familyId: family.id,
        title: "How did grandma meet grandpa?",
        body: "Eleanor Whitaker met Samuel Hart at the Grange hall harvest dance in Cedar Falls, Iowa, on a Saturday in October 1947. She wrote to her sister Ruth six days later.",
        recordedAt: new Date("2026-09-22"),
        people: { create: [{ personId: eleanor.id }, { personId: samuel.id }] },
      },
      update: { title: "How did grandma meet grandpa?" },
    });
    const existingCite = await prisma.citation.findFirst({
      where: { storyId: askStory.id, documentId: harvest.id },
    });
    if (!existingCite) {
      await prisma.citation.create({
        data: {
          familyId: family.id,
          storyId: askStory.id,
          documentId: harvest.id,
          claim: "They danced three times, the cider was too sweet, and he asked to walk her home past the cottonwoods.",
          pageNote: harvest.title,
          kind: "ask",
          quality: "copy",
        },
      });
    }
    await prisma.askConversation.upsert({
      where: { id: "ask-harvest-story" },
      create: {
        id: "ask-harvest-story",
        familyId: family.id,
        userId: demoUser.id,
        title: "How did grandma meet grandpa?",
        saved: true,
        storyId: askStory.id,
        turns: {
          create: [
            { role: "user", text: "How did grandma meet grandpa?" },
            {
              role: "assistant",
              text: askStory.body,
              sourcesJson: JSON.stringify([
                {
                  documentId: harvest.id,
                  title: harvest.title,
                  writtenAt: "18 October 1947",
                  kind: "letter",
                  excerpt: "I danced three times with Samuel Hart from the north farm.",
                },
              ]),
            },
          ],
        },
      },
      update: { storyId: askStory.id, saved: true },
    });
  }

  const livingAdults = [margaret, people.find((person) => person.id === "person-lily"), people.find((person) => person.id === "person-wei")]
    .filter((person): person is NonNullable<typeof person> => Boolean(person));
  for (const person of livingAdults) {
    await prisma.shareConsent.upsert({
      where: { familyId_personId: { familyId: family.id, personId: person.id } },
      create: {
        familyId: family.id,
        personId: person.id,
        granted: true,
        grantedOn: new Date("2026-03-12"),
        notes: "They said the picnic and the cedar chest may be shared.",
      },
      update: { granted: true },
    });
  }

  await prisma.person.upsert({
    where: { id: "person-agnes" },
    create: {
      id: "person-agnes",
      familyId: family.id,
      displayName: "Agnes Whitaker",
      givenName: "Agnes",
      familyName: "Whitaker",
      birthDate: new Date("1926-04-08"),
      sex: "F",
      notes: "Eleanor’s older sister. Turns 100 in 2026.",
    },
    update: { birthDate: new Date("1926-04-08"), deathDate: null },
  });

  if (harvest) {
    const harvestPeople = await prisma.documentPerson.findMany({ where: { documentId: harvest.id } });
    await prisma.document.upsert({
      where: { id: "doc-harvest-copy" },
      create: {
        id: "doc-harvest-copy",
        familyId: family.id,
        title: "Letter: Eleanor to Ruth, harvest dance (second typing)",
        kind: DocKind.letter,
        transcript: HARVEST_LETTER,
        writtenAt: new Date("1947-10-18"),
        people: { create: harvestPeople.map((row) => ({ personId: row.personId })) },
      },
      update: { transcript: HARVEST_LETTER, writtenAt: new Date("1947-10-18") },
    });
  }

  await prisma.handwritingSample.upsert({
    where: { id: "handwriting-samuel" },
    create: {
      id: "handwriting-samuel",
      familyId: family.id,
      personId: samuel.id,
      documentId: "doc-wedding",
      notes: "Short, upright strokes on the Bible note.",
    },
    update: { notes: "Short, upright strokes on the Bible note." },
  });

  const adoptive = await prisma.relationship.findFirst({
    where: { familyId: family.id, fromPersonId: "person-robert", toPersonId: "person-peter", type: RelType.adoptive },
  });
  if (adoptive) {
    const paperDoc = await prisma.document.upsert({
      where: { id: "doc-peter-adoption" },
      create: {
        id: "doc-peter-adoption",
        familyId: family.id,
        title: "Adoption of Peter Hart",
        kind: DocKind.note,
        transcript: "Robert Hart adopted Peter after the flood year.",
        writtenAt: new Date("1994-05-12"),
        people: { create: [{ personId: "person-robert" }, { personId: "person-peter" }] },
      },
      update: { title: "Adoption of Peter Hart" },
    });
    await prisma.adoptionPaper.upsert({
      where: { relationshipId: adoptive.id },
      create: {
        familyId: family.id,
        relationshipId: adoptive.id,
        documentId: paperDoc.id,
        grantedOn: new Date("1994-05-12"),
        notes: "After the flood year.",
      },
      update: { documentId: paperDoc.id, grantedOn: new Date("1994-05-12") },
    });
  }

  await prisma.lifeEvent.upsert({
    where: { id: "event-about-dance" },
    create: {
      id: "event-about-dance",
      familyId: family.id,
      personId: eleanor.id,
      placeId: grange.id,
      kind: EventKind.other,
      title: "They met about harvest time",
      summary: "The family says it was around the 1947 harvest, not a single day.",
      happenedOn: new Date("1947-10-01"),
      rangeEnd: new Date("1947-10-31"),
      precision: DatePrecision.circa,
    },
    update: {
      rangeEnd: new Date("1947-10-31"),
      precision: DatePrecision.circa,
      title: "They met about harvest time",
    },
  });

  const lilyForYear = people.find((person) => person.id === "person-lily");
  const margaretForYear = people.find((person) => person.id === "person-margaret");

  await prisma.family.update({
    where: { id: family.id },
    data: {
      bannerText: "The Harts of Cedar Falls",
      bannerNote: "He called her Whitaker as if it were a compliment.",
    },
  });

  if (lilyForYear) {
    await prisma.researchTask.updateMany({
      where: { id: "task-ask-lily-hatband", familyId: family.id },
      data: { assigneeId: lilyForYear.id },
    });
  }
  if (margaretForYear) {
    await prisma.digitizeItem.updateMany({
      where: { id: "digitize-ruth-chest", familyId: family.id },
      data: { assigneeId: margaretForYear.id },
    });
  }

  if (samuel) {
    await prisma.cityDirectory.upsert({
      where: { id: "dir-samuel-1950" },
      create: {
        id: "dir-samuel-1950",
        familyId: family.id,
        personId: samuel.id,
        name: "Hart, Samuel",
        occupation: "farmer",
        address: "North farm, Cedar Falls",
        year: 1950,
        notes: "The book listed the north farm after the harvest.",
      },
      update: { occupation: "farmer", address: "North farm, Cedar Falls", year: 1950 },
    });
    await prisma.militaryPaper.upsert({
      where: { id: "paper-samuel-draft" },
      create: {
        id: "paper-samuel-draft",
        familyId: family.id,
        personId: samuel.id,
        serviceId: "mil-samuel-draft",
        kind: "draft",
        year: 1944,
        numberNote: "Black Hawk board",
        notes: "A week of processing, then home for harvest.",
      },
      update: { serviceId: "mil-samuel-draft", kind: "draft", year: 1944 },
    });
  }

  await prisma.schoolClass.upsert({
    where: { id: "class-cfhs-1945" },
    create: {
      id: "class-cfhs-1945",
      familyId: family.id,
      school: "Cedar Falls High",
      year: 1945,
      place: "Cedar Falls, Iowa",
      notes: "She finished in the spring before the last wartime harvest.",
    },
    update: { school: "Cedar Falls High", year: 1945 },
  });
  await prisma.schoolClassPupil.upsert({
    where: { classId_personId: { classId: "class-cfhs-1945", personId: eleanor.id } },
    create: { classId: "class-cfhs-1945", personId: eleanor.id },
    update: {},
  });

  const reunionEvent = await prisma.lifeEvent.upsert({
    where: { id: "event-reunion-2026" },
    create: {
      id: "event-reunion-2026",
      familyId: family.id,
      personId: lilyForYear?.id ?? eleanor.id,
      kind: EventKind.reunion,
      title: "Hart reunion at the north farm",
      summary: "Cold chicken under the cottonwoods.",
      happenedOn: new Date("2026-07-04"),
    },
    update: { title: "Hart reunion at the north farm", happenedOn: new Date("2026-07-04") },
  });
  if (lilyForYear) {
    await prisma.eventWitness.upsert({
      where: { eventId_personId: { eventId: reunionEvent.id, personId: lilyForYear.id } },
      create: {
        familyId: family.id,
        eventId: reunionEvent.id,
        personId: lilyForYear.id,
        role: "there",
      },
      update: { role: "there" },
    });
  }

  await prisma.story.upsert({
    where: { id: "story-cottonwoods-2026" },
    create: {
      id: "story-cottonwoods-2026",
      familyId: family.id,
      title: "Cottonwoods this summer",
      body: "Lily said the cottonwoods still hold the walk home, the same way Ellie wrote it.",
      recordedAt: new Date("2026-07-04"),
      tellerPersonId: lilyForYear?.id ?? null,
      people: lilyForYear ? { create: { personId: lilyForYear.id } } : undefined,
    },
    update: { title: "Cottonwoods this summer", recordedAt: new Date("2026-07-04") },
  });

  await prisma.residence.upsert({
    where: { id: "res-eleanor-farm" },
    create: {
      id: "res-eleanor-farm",
      familyId: family.id,
      personId: eleanor.id,
      placeId: northFarm.id,
      startedAt: new Date("1948-06-14"),
      endedAt: new Date("2015-06-03"),
      notes: "After the wedding she lived on the north farm with Sam.",
    },
    update: { notes: "After the wedding she lived on the north farm with Sam." },
  });

  const harvestForHunt = await prisma.document.findUnique({ where: { id: "doc-harvest" } });
  const picnicForHunt = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Hart picnic, 1961" },
  });
  const hunt = await prisma.hunt.upsert({
    where: { id: "hunt-harvest" },
    create: {
      id: "hunt-harvest",
      familyId: family.id,
      title: "Harvest scavenger hunt",
      notes: "Clues that point to the letter, the picnic, and the north farm.",
    },
    update: { title: "Harvest scavenger hunt" },
  });
  if (harvestForHunt) {
    await prisma.huntClue.upsert({
      where: { id: "clue-harvest-letter" },
      create: {
        id: "clue-harvest-letter",
        familyId: family.id,
        huntId: hunt.id,
        clue: "Six days after the dance she wrote to Ruth.",
        targetKind: "letter",
        answer: "The harvest letter",
        citation: harvestForHunt.title,
        documentId: harvestForHunt.id,
        sortOrder: 0,
      },
      update: { documentId: harvestForHunt.id, citation: harvestForHunt.title },
    });
    await prisma.placePin.upsert({
      where: { id: "pin-harvest-grange" },
      create: {
        id: "pin-harvest-grange",
        familyId: family.id,
        placeId: grange.id,
        title: "The harvest letter at the Grange",
        documentId: harvestForHunt.id,
      },
      update: { title: "The harvest letter at the Grange", documentId: harvestForHunt.id },
    });
  }
  if (picnicForHunt) {
    await prisma.huntClue.upsert({
      where: { id: "clue-picnic-photo" },
      create: {
        id: "clue-picnic-photo",
        familyId: family.id,
        huntId: hunt.id,
        clue: "Sunday rolls under the cottonwoods, 1961.",
        targetKind: "photo",
        answer: "Hart picnic, 1961",
        citation: picnicForHunt.title,
        assetId: picnicForHunt.id,
        sortOrder: 1,
      },
      update: { assetId: picnicForHunt.id, citation: picnicForHunt.title },
    });
  }
  await prisma.huntClue.upsert({
    where: { id: "clue-north-farm" },
    create: {
      id: "clue-north-farm",
      familyId: family.id,
      huntId: hunt.id,
      clue: "The north forty after they married.",
      targetKind: "place",
      answer: "North farm",
      citation: northFarm.name,
      placeId: northFarm.id,
      sortOrder: 2,
    },
    update: { placeId: northFarm.id, citation: northFarm.name },
  });
  await prisma.placePin.upsert({
    where: { id: "pin-cottonwoods-farm" },
    create: {
      id: "pin-cottonwoods-farm",
      familyId: family.id,
      placeId: northFarm.id,
      title: "Cottonwoods this summer",
      storyId: "story-cottonwoods-2026",
    },
    update: { title: "Cottonwoods this summer", storyId: "story-cottonwoods-2026" },
  });
  await prisma.newsletterDraft.upsert({
    where: { familyId_month: { familyId: family.id, month: "2026-09" } },
    create: {
      id: "draft-2026-09",
      familyId: family.id,
      month: "2026-09",
      body: "Dear family — this month we pinned the harvest letter to the Grange and lined Margaret and Robert up by birth. Edit this before it goes out.",
    },
    update: {
      body: "Dear family — this month we pinned the harvest letter to the Grange and lined Margaret and Robert up by birth. Edit this before it goes out.",
    },
  });
  for (const item of [
    { kind: "birth", title: "Birth certificate" },
    { kind: "marriage", title: "Marriage record" },
    { kind: "death", title: "Death certificate" },
    { kind: "census", title: "Census" },
    { kind: "obituary", title: "Obituary" },
    { kind: "will", title: "Will" },
    { kind: "letter", title: "Letter" },
    { kind: "photo", title: "Photograph" },
  ]) {
    await prisma.researchChecklistItem.upsert({
      where: { familyId_kind: { familyId: family.id, kind: item.kind } },
      create: {
        familyId: family.id,
        kind: item.kind,
        title: item.title,
        doneAt: item.kind === "letter" || item.kind === "photo" ? new Date("2026-09-01") : null,
      },
      update: { title: item.title },
    });
  }

  await prisma.place.update({
    where: { id: cedar.id },
    data: { gps: "42.5278 N, 92.4453 W" },
  });
  await prisma.personName.updateMany({
    where: { id: "name-eleanor-ellie" },
    data: { notes: "What Sam called her at the dance and what the grandchildren still say at supper." },
  });
  await prisma.personName.updateMany({
    where: { id: "name-margaret-meg" },
    data: { notes: "The name on the cedar-chest notes, used when Ellie wrote home." },
  });
  if (demoUser) {
    await prisma.huntFinish.upsert({
      where: { huntId_userId: { huntId: hunt.id, userId: demoUser.id } },
      create: { huntId: hunt.id, userId: demoUser.id, familyId: family.id, finishedAt: new Date("2026-09-12") },
      update: { finishedAt: new Date("2026-09-12") },
    });
    await prisma.familyVisit.upsert({
      where: { userId_familyId: { userId: demoUser.id, familyId: family.id } },
      create: {
        userId: demoUser.id,
        familyId: family.id,
        seenAt: new Date("2026-09-01"),
        previousAt: new Date("2026-08-01"),
      },
      update: { seenAt: new Date("2026-09-01"), previousAt: new Date("2026-08-01") },
    });
  }
  const lilySeat = people.find((person) => person.id === "person-lily");
  const megSeat = people.find((person) => person.id === "person-margaret");
  const robertSeat = people.find((person) => person.id === "person-robert");
  if (lilySeat) {
    await prisma.reunionSeat.upsert({
      where: { reunionId_personId: { reunionId: reunion.id, personId: lilySeat.id } },
      create: {
        id: "seat-lily-cottonwood",
        familyId: family.id,
        reunionId: reunion.id,
        personId: lilySeat.id,
        tableName: "Cottonwood table",
        seat: 1,
      },
      update: { tableName: "Cottonwood table", seat: 1 },
    });
  }
  if (megSeat) {
    await prisma.reunionSeat.upsert({
      where: { reunionId_personId: { reunionId: reunion.id, personId: megSeat.id } },
      create: {
        id: "seat-meg-cottonwood",
        familyId: family.id,
        reunionId: reunion.id,
        personId: megSeat.id,
        tableName: "Cottonwood table",
        seat: 2,
      },
      update: { tableName: "Cottonwood table", seat: 2 },
    });
  }
  if (robertSeat) {
    await prisma.reunionSeat.upsert({
      where: { reunionId_personId: { reunionId: reunion.id, personId: robertSeat.id } },
      create: {
        id: "seat-robert-north",
        familyId: family.id,
        reunionId: reunion.id,
        personId: robertSeat.id,
        tableName: "North farm table",
        seat: 1,
      },
      update: { tableName: "North farm table", seat: 1 },
    });
  }
  await prisma.document.updateMany({
    where: { id: "doc-harvest" },
    data: { fragileOriginal: true },
  });
  await prisma.lifeDraft.upsert({
    where: { familyId_personId: { familyId: family.id, personId: eleanor.id } },
    create: {
      id: "draft-eleanor",
      familyId: family.id,
      personId: eleanor.id,
      title: "Draft life story for Eleanor Hart",
      body: "From Letter: Eleanor to Ruth, 18 October 1947: I danced three times with Samuel Hart from the north farm.\n\nFrom Cottonwoods this summer: Lily said the cottonwoods still hold the walk home, the same way Ellie wrote it.",
    },
    update: {
      title: "Draft life story for Eleanor Hart",
      body: "From Letter: Eleanor to Ruth, 18 October 1947: I danced three times with Samuel Hart from the north farm.\n\nFrom Cottonwoods this summer: Lily said the cottonwoods still hold the walk home, the same way Ellie wrote it.",
    },
  });

  await prisma.lifeEvent.upsert({
    where: { id: "event-ellie-first-house" },
    create: {
      id: "event-ellie-first-house",
      familyId: family.id,
      personId: eleanor.id,
      kind: EventKind.residence,
      title: "The Cedar Falls bungalow",
      summary: "Their first house after the cottonwood wedding.",
      happenedOn: new Date("1948-06-20"),
      firstTag: "house",
    },
    update: { firstTag: "house", title: "The Cedar Falls bungalow" },
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-ellie-first-car" },
    create: {
      id: "event-ellie-first-car",
      familyId: family.id,
      personId: eleanor.id,
      kind: EventKind.other,
      title: "The navy Ford",
      summary: "Sam bought it the spring after the harvest-dance anniversary.",
      happenedOn: new Date("1950-05-01"),
      firstTag: "car",
    },
    update: { firstTag: "car", title: "The navy Ford" },
  });
  await prisma.lifeEvent.upsert({
    where: { id: "event-ellie-first-child" },
    create: {
      id: "event-ellie-first-child",
      familyId: family.id,
      personId: eleanor.id,
      otherPersonId: "person-margaret",
      kind: EventKind.other,
      title: "Margaret was born",
      summary: "Their first child, later Meg.",
      happenedOn: new Date("1952-04-02"),
      firstTag: "child",
    },
    update: { firstTag: "child", title: "Margaret was born" },
  });

  await prisma.document.updateMany({
    where: { id: "doc-sunday-rolls" },
    data: { holidayId: "holiday-harvest" },
  });
  if (demoUser) {
    const envelopePath = writeMedia(
      family.id,
      "harvest-envelope.svg",
      svgScene("Envelope", "Eleanor Whitaker to Ruth Whitaker", "18 October 1947", "#5c4634"),
    );
    const envelopeScan = await prisma.asset.upsert({
      where: { id: "asset-harvest-envelope" },
      create: {
        id: "asset-harvest-envelope",
        familyId: family.id,
        kind: AssetKind.letter,
        title: "Harvest letter envelope",
        mimeType: "image/svg+xml",
        storagePath: envelopePath,
        capturedAt: new Date("1947-10-18"),
        uploadedById: demoUser.id,
      },
      update: { title: "Harvest letter envelope", storagePath: envelopePath },
    });
    await prisma.document.updateMany({
      where: { id: "doc-harvest" },
      data: {
        envelopeFrom: "Eleanor Whitaker, Cedar Falls",
        envelopeTo: "Ruth Whitaker",
        envelopeAssetId: envelopeScan.id,
      },
    });
    await prisma.familyVaultNote.upsert({
      where: { id: "vault-ancestry" },
      create: {
        id: "vault-ancestry",
        familyId: family.id,
        title: "Ancestry login",
        body: "Shared Hart family account. Owners only — do not put this on the memorial.",
        createdById: demoUser.id,
      },
      update: { title: "Ancestry login", body: "Shared Hart family account. Owners only — do not put this on the memorial." },
    });
    const spokenPath = writeWav(family.id, "eleanor-name.wav");
    const spoken = await prisma.asset.upsert({
      where: { id: "asset-eleanor-spoken" },
      create: {
        id: "asset-eleanor-spoken",
        familyId: family.id,
        kind: AssetKind.audio,
        title: "Eleanor, said out loud",
        mimeType: "audio/wav",
        storagePath: spokenPath,
        uploadedById: demoUser.id,
      },
      update: { title: "Eleanor, said out loud", storagePath: spokenPath },
    });
    await prisma.person.update({
      where: { id: eleanor.id },
      data: { pronunciationAssetId: spoken.id, pronunciation: "EL-uh-nor hart" },
    });
  }

  await prisma.photoPair.updateMany({
    where: { id: "pair-grange" },
    data: { placeId: "place-grange" },
  });
  await prisma.document.updateMany({
    where: { id: "doc-harvest" },
    data: {
      stampText: "Cedar Falls, Iowa",
      postmarkedAt: new Date("1947-10-19"),
    },
  });
  await prisma.lifeEvent.updateMany({
    where: { id: "event-harvest-dance" },
    data: { preferred: true },
  });
  await prisma.citation.updateMany({
    where: { id: "cite-harvest-dance" },
    data: { quality: "original" },
  });
  const lilyLiving = people.find((person) => person.id === "person-lily");
  const margaretLiving = people.find((person) => person.id === "person-margaret");
  const robertLiving = people.find((person) => person.id === "person-robert");
  if (lilyLiving) {
    await prisma.residence.upsert({
      where: { id: "res-lily-cedar" },
      create: {
        id: "res-lily-cedar",
        familyId: family.id,
        personId: lilyLiving.id,
        placeId: cedar.id,
        startedAt: new Date("2006-08-01"),
        notes: "Lily still keeps Sunday rolls on Market Street.",
      },
      update: { endedAt: null, notes: "Lily still keeps Sunday rolls on Market Street." },
    });
    await prisma.familyPhoneContact.upsert({
      where: { id: "phone-lily" },
      create: {
        id: "phone-lily",
        familyId: family.id,
        personId: lilyLiving.id,
        phone: "319-555-1947",
        callOrder: 1,
        notes: "Call first when news spreads.",
      },
      update: { phone: "319-555-1947", callOrder: 1 },
    });
  }
  if (margaretLiving) {
    await prisma.residence.upsert({
      where: { id: "res-margaret-cedar" },
      create: {
        id: "res-margaret-cedar",
        familyId: family.id,
        personId: margaretLiving.id,
        placeId: cedar.id,
        startedAt: new Date("1984-06-15"),
        notes: "Home after Iowa City, still in Cedar Falls.",
      },
      update: { endedAt: null },
    });
    await prisma.familyPhoneContact.upsert({
      where: { id: "phone-margaret" },
      create: {
        id: "phone-margaret",
        familyId: family.id,
        personId: margaretLiving.id,
        phone: "319-555-1952",
        callOrder: 2,
        notes: "After Lily.",
      },
      update: { phone: "319-555-1952", callOrder: 2 },
    });
  }
  if (robertLiving) {
    await prisma.residence.upsert({
      where: { id: "res-robert-farm" },
      create: {
        id: "res-robert-farm",
        familyId: family.id,
        personId: robertLiving.id,
        placeId: northFarm.id,
        startedAt: new Date("1980-05-01"),
        notes: "Still on the north farm.",
      },
      update: { endedAt: null },
    });
    await prisma.familyPhoneContact.upsert({
      where: { id: "phone-robert" },
      create: {
        id: "phone-robert",
        familyId: family.id,
        personId: robertLiving.id,
        phone: "319-555-1955",
        callOrder: 3,
        notes: "If the farm line is busy, try the shed.",
      },
      update: { phone: "319-555-1955", callOrder: 3 },
    });
  }
  if (demoUser) {
    await prisma.homeGuestBook.upsert({
      where: { id: "guestbook-lily" },
      create: {
        id: "guestbook-lily",
        familyId: family.id,
        authorId: demoUser.id,
        body: "Lily Chen visited from Cedar Falls and left Sunday rolls on the table.",
      },
      update: { body: "Lily Chen visited from Cedar Falls and left Sunday rolls on the table." },
    });
  }

  const eleanorPortrait = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Eleanor Hart, about 1948" },
  });
  if (eleanorPortrait) {
    await prisma.asset.update({ where: { id: eleanorPortrait.id }, data: { placeId: cedar.id } });
  }
  const danceForWeather = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Harvest dance, Grange hall" },
  });
  if (danceForWeather) {
    await prisma.asset.update({
      where: { id: danceForWeather.id },
      data: { weather: "A hard frost, then a clear night for the fiddle." },
    });
  }
  await prisma.document.updateMany({
    where: { id: "doc-harvest" },
    data: {
      weather: "The family remembered a hard frost the morning after the dance.",
      secretUntil: new Date("1948-10-18"),
    },
  });
  const picnicForBorrow = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Hart picnic, 1961" },
  });
  if (picnicForBorrow) {
    await prisma.asset.update({
      where: { id: picnicForBorrow.id },
      data: { borrowedFromAlbumId: "album-harvest" },
    });
  }
  const picnicFilmForCaptions = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Picnic home movie, 1961" },
  });
  const spokenForCaptions = await prisma.asset.findFirst({
    where: { id: "asset-eleanor-spoken" },
  });
  if (picnicFilmForCaptions) {
    await prisma.filmCaption.upsert({
      where: { id: "caption-sunday-rolls" },
      create: {
        id: "caption-sunday-rolls",
        familyId: family.id,
        filmId: picnicFilmForCaptions.id,
        oralAssetId: spokenForCaptions?.id || null,
        seconds: 12,
        text: "Mother is cutting Sunday rolls under the cottonwoods.",
      },
      update: { text: "Mother is cutting Sunday rolls under the cottonwoods.", seconds: 12 },
    });
    await prisma.filmCaption.upsert({
      where: { id: "caption-how-they-met" },
      create: {
        id: "caption-how-they-met",
        familyId: family.id,
        filmId: picnicFilmForCaptions.id,
        oralAssetId: spokenForCaptions?.id || null,
        seconds: 83,
        text: "The children ask how Grandma met Grandpa.",
      },
      update: { seconds: 83 },
    });
  }
  if (lilyLiving) {
    await prisma.familyAddress.upsert({
      where: { id: "addr-lily-market" },
      create: {
        id: "addr-lily-market",
        familyId: family.id,
        personId: lilyLiving.id,
        label: "Lily on Market Street",
        line: "14 Market Street",
        locality: "Cedar Falls",
        region: "Iowa",
        country: "United States",
        startedOn: new Date("2006-08-01"),
      },
      update: { line: "14 Market Street", endedOn: null },
    });
  }
  await prisma.document.upsert({
    where: { id: "doc-secret-lily" },
    create: {
      id: "doc-secret-lily",
      familyId: family.id,
      title: "For Lily, not yet",
      kind: DocKind.letter,
      transcript: "I still have the hatband in the drawer. Open this when you are ready.",
      writtenAt: new Date("1948-10-18"),
      secretUntil: new Date("2030-01-01"),
      people: lilyLiving ? { create: [{ personId: lilyLiving.id }] } : undefined,
    },
    update: { secretUntil: new Date("2030-01-01") },
  });
  await prisma.familyBranch.updateMany({
    where: { id: "branch-cedar-falls-harts" },
    data: { color: "#4d5b3c" },
  });
  await prisma.document.updateMany({
    where: { id: "doc-ruth-reply" },
    data: { ocrConfidence: 62, needsReview: true },
  });
  if (demoUser) {
    await prisma.journalEntry.upsert({
      where: { id: "journal-secret-lily" },
      create: {
        id: "journal-secret-lily",
        familyId: family.id,
        authorId: demoUser.id,
        title: "What I have not said yet",
        body: "The hatband is still in the cedar drawer.",
        recordedAt: new Date("2016-03-12"),
        secretUntil: new Date("2030-01-01"),
      },
      update: { secretUntil: new Date("2030-01-01") },
    });
    await prisma.journalEntry.upsert({
      where: { id: "journal-opened-rolls" },
      create: {
        id: "journal-opened-rolls",
        familyId: family.id,
        authorId: demoUser.id,
        title: "Sunday rolls after the picnic",
        body: "We opened this the summer after the harvest-dance anniversary.",
        recordedAt: new Date("1962-07-04"),
        secretUntil: new Date("1963-01-01"),
      },
      update: { secretUntil: new Date("1963-01-01") },
    });
  }

  const unsortedProgram = await prisma.asset.findUnique({ where: { id: "asset-unsorted-program" } });
  if (unsortedProgram && demoUser) {
    await prisma.photoGuess.upsert({
      where: { id: "guess-unsorted-program" },
      create: {
        id: "guess-unsorted-program",
        familyId: family.id,
        assetId: unsortedProgram.id,
        userId: demoUser.id,
        personId: eleanor.id,
        name: "Eleanor at the harvest program",
        note: "The hatband is the same one from the Grange hall.",
      },
      update: { personId: eleanor.id, name: "Eleanor at the harvest program" },
    });
  }
  await prisma.reunionShopItem.upsert({
    where: { id: "shop-hart-plates" },
    create: {
      id: "shop-hart-plates",
      familyId: family.id,
      reunionId: "reunion-hart-2026",
      label: "Plates",
      quantity: 48,
      notes: "Paper, the harvest-dance cream color.",
    },
    update: { quantity: 48 },
  });
  await prisma.reunionShopItem.upsert({
    where: { id: "shop-hart-chairs" },
    create: {
      id: "shop-hart-chairs",
      familyId: family.id,
      reunionId: "reunion-hart-2026",
      label: "Chairs",
      quantity: 40,
      notes: "Folding chairs from the Grange closet.",
    },
    update: { quantity: 40 },
  });
  await prisma.reunionShopItem.upsert({
    where: { id: "shop-hart-tags" },
    create: {
      id: "shop-hart-tags",
      familyId: family.id,
      reunionId: "reunion-hart-2026",
      label: "Name tags",
      quantity: 60,
      notes: "Print the living-tree names.",
    },
    update: { quantity: 60 },
  });
  await prisma.placeName.upsert({
    where: { id: "pname-sams-place" },
    create: {
      id: "pname-sams-place",
      familyId: family.id,
      placeId: "place-north-farm",
      name: "Sam’s place",
      notes: "How Ellie still said the north farm.",
    },
    update: { name: "Sam’s place" },
  });
  if (demoUser) {
    await prisma.readLater.upsert({
      where: { id: "later-harvest" },
      create: {
        id: "later-harvest",
        familyId: family.id,
        userId: demoUser.id,
        documentId: "doc-harvest",
      },
      update: { documentId: "doc-harvest" },
    });
  }
  if (lilyLiving) {
    await prisma.reunionGuest.upsert({
      where: { reunionId_personId: { reunionId: "reunion-hart-2026", personId: lilyLiving.id } },
      create: {
        reunionId: "reunion-hart-2026",
        personId: lilyLiving.id,
        coming: true,
        arrived: true,
        arrivedAt: new Date("2026-09-22T14:00:00Z"),
      },
      update: { arrived: true, arrivedAt: new Date("2026-09-22T14:00:00Z") },
    });
  }

  await prisma.family.update({
    where: { id: family.id },
    data: {
      rulesText: [
        "Viewers do not see a living relative’s birth year or private notes.",
        "Ask stays out of letters marked keep-out.",
        "Owners invite; a guest-researcher invite can expire.",
        "The harvest-dance hats stay in the family.",
      ].join("\n"),
    },
  });
  await prisma.document.updateMany({
    where: { id: "doc-harvest" },
    data: { postage: "3 cents" },
  });
  await prisma.asset.updateMany({
    where: { id: "asset-eleanor-spoken" },
    data: { spokenById: eleanor.id },
  });
  await prisma.reunionGathering.upsert({
    where: { id: "reunion-hart-harvest-2026" },
    create: {
      id: "reunion-hart-harvest-2026",
      familyId: family.id,
      title: "Harvest-dance anniversary supper",
      place: "Grange hall",
      happenedOn: new Date("2026-10-18"),
      notes: "The next family hour after the July picnic.",
    },
    update: { happenedOn: new Date("2026-10-18"), title: "Harvest-dance anniversary supper" },
  });
  if (lilyLiving) {
    await prisma.interviewPlan.upsert({
      where: { id: "plan-lily-2026" },
      create: {
        id: "plan-lily-2026",
        familyId: family.id,
        personId: lilyLiving.id,
        scheduledOn: new Date("2026-10-19"),
        notes: "Ask Lily how the Sunday rolls stayed warm.",
      },
      update: { scheduledOn: new Date("2026-10-19") },
    });
  }
  if (demoUser) {
    const picnicCopyPath = writeMedia(
      family.id,
      "picnic-copy.svg",
      svgScene("Family picnic", "North farm meadow", "Summer 1961", "#4d5b3c"),
    );
    await prisma.asset.upsert({
      where: { id: "asset-picnic-copy" },
      create: {
        id: "asset-picnic-copy",
        familyId: family.id,
        kind: AssetKind.photo,
        title: "Hart picnic, 1961 (copy)",
        mimeType: "image/svg+xml",
        storagePath: picnicCopyPath,
        capturedAt: new Date("1961-07-04T16:00:00Z"),
        uploadedById: demoUser.id,
      },
      update: { title: "Hart picnic, 1961 (copy)", storagePath: picnicCopyPath },
    });
  }
  await prisma.lifeEvent.upsert({
    where: { id: "event-same-day-eleanor" },
    create: {
      id: "event-same-day-eleanor",
      familyId: family.id,
      personId: eleanor.id,
      kind: EventKind.other,
      title: "Eleanor hems the harvest dress",
      happenedOn: new Date("1947-09-22"),
    },
    update: { happenedOn: new Date("1947-09-22"), title: "Eleanor hems the harvest dress" },
  });

  await prisma.document.updateMany({
    where: { id: "doc-harvest" },
    data: { foldPattern: "in thirds" },
  });
  const eleanorFavorite = await prisma.asset.findFirst({
    where: { familyId: family.id, title: "Eleanor Hart, about 1948", deletedAt: null },
  });
  if (eleanorFavorite) {
    await prisma.person.update({
      where: { id: eleanor.id },
      data: { favoriteAssetId: eleanorFavorite.id },
    });
    await prisma.asset.update({
      where: { id: eleanorFavorite.id },
      data: { createdAt: new Date("2016-03-12T14:00:00Z") },
    });
  }
  if (lilyLiving) {
    await prisma.inheritanceItem.upsert({
      where: { id: "inherit-hatband" },
      create: {
        id: "inherit-hatband",
        familyId: family.id,
        personId: lilyLiving.id,
        documentId: "doc-samuel-will",
        probateId: "probate-samuel",
        title: "Navy hatband",
        notes: "Whoever still keeps Sunday rolls.",
      },
      update: { title: "Navy hatband", documentId: "doc-samuel-will", probateId: "probate-samuel" },
    });
  }
  if (robertLiving) {
    await prisma.inheritanceItem.upsert({
      where: { id: "inherit-north-farm" },
      create: {
        id: "inherit-north-farm",
        familyId: family.id,
        personId: robertLiving.id,
        documentId: "doc-samuel-will",
        probateId: "probate-samuel",
        title: "North farm",
        notes: "The bee yard stays with the children.",
      },
      update: { title: "North farm", documentId: "doc-samuel-will", probateId: "probate-samuel" },
    });
  }
  await prisma.storyPrompt.upsert({
    where: { id: "prompt-sunday-rolls" },
    create: {
      id: "prompt-sunday-rolls",
      familyId: family.id,
      title: "Who still makes the Sunday rolls?",
      body: "Name the bowl and the hands.",
    },
    update: { title: "Who still makes the Sunday rolls?" },
  });
  if (demoUser && lilyLiving && margaretLiving) {
    const lilyCircle = await prisma.document.upsert({
      where: { id: "doc-circle-lily-met" },
      create: {
        id: "doc-circle-lily-met",
        familyId: family.id,
        title: "Lily Chen on how the grandparents met",
        kind: DocKind.story,
        transcript: "Grandma said the cider was too sweet and Grandpa asked to walk her home past the cottonwoods.",
        writtenAt: new Date("2024-07-04"),
        people: { create: [{ personId: lilyLiving.id }] },
      },
      update: { transcript: "Grandma said the cider was too sweet and Grandpa asked to walk her home past the cottonwoods." },
    });
    const lilyStory = await prisma.story.upsert({
      where: { id: "story-circle-lily-met" },
      create: {
        id: "story-circle-lily-met",
        familyId: family.id,
        title: "Lily Chen on how the grandparents met",
        body: lilyCircle.transcript,
        recordedAt: new Date("2024-07-04"),
        tellerPersonId: lilyLiving.id,
        documentId: lilyCircle.id,
        people: { create: [{ personId: lilyLiving.id }] },
      },
      update: { body: lilyCircle.transcript, documentId: lilyCircle.id },
    });
    await prisma.storyPromptAnswer.upsert({
      where: { id: "answer-circle-lily-met" },
      create: {
        id: "answer-circle-lily-met",
        promptId: "prompt-how-met",
        storyId: lilyStory.id,
        authorId: demoUser.id,
      },
      update: { storyId: lilyStory.id },
    });
    const megCircle = await prisma.document.upsert({
      where: { id: "doc-circle-meg-met" },
      create: {
        id: "doc-circle-meg-met",
        familyId: family.id,
        title: "Margaret Chen on how the grandparents met",
        kind: DocKind.story,
        transcript: "Mother handed me the harvest letter. That is still how I tell it: the Grange hall, then the cottonwoods.",
        writtenAt: new Date("2016-03-12"),
        people: { create: [{ personId: margaretLiving.id }] },
      },
      update: { transcript: "Mother handed me the harvest letter. That is still how I tell it: the Grange hall, then the cottonwoods." },
    });
    const megStory = await prisma.story.upsert({
      where: { id: "story-circle-meg-met" },
      create: {
        id: "story-circle-meg-met",
        familyId: family.id,
        title: "Margaret Chen on how the grandparents met",
        body: megCircle.transcript,
        recordedAt: new Date("2016-03-12"),
        tellerPersonId: margaretLiving.id,
        documentId: megCircle.id,
        people: { create: [{ personId: margaretLiving.id }] },
      },
      update: { body: megCircle.transcript, documentId: megCircle.id },
    });
    await prisma.storyPromptAnswer.upsert({
      where: { id: "answer-circle-meg-met" },
      create: {
        id: "answer-circle-meg-met",
        promptId: "prompt-how-met",
        storyId: megStory.id,
        authorId: demoUser.id,
      },
      update: { storyId: megStory.id },
    });
    const rollsDoc = await prisma.document.upsert({
      where: { id: "doc-circle-meg-rolls" },
      create: {
        id: "doc-circle-meg-rolls",
        familyId: family.id,
        title: "Margaret Chen on Sunday rolls",
        kind: DocKind.story,
        transcript: "The navy-blue bowl is still in the upstairs hall. Lily warms the milk now.",
        writtenAt: new Date("2024-03-31"),
        people: { create: [{ personId: margaretLiving.id }] },
      },
      update: { transcript: "The navy-blue bowl is still in the upstairs hall. Lily warms the milk now." },
    });
    const rollsStory = await prisma.story.upsert({
      where: { id: "story-circle-meg-rolls" },
      create: {
        id: "story-circle-meg-rolls",
        familyId: family.id,
        title: "Margaret Chen on Sunday rolls",
        body: rollsDoc.transcript,
        recordedAt: new Date("2024-03-31"),
        tellerPersonId: margaretLiving.id,
        documentId: rollsDoc.id,
        people: { create: [{ personId: margaretLiving.id }] },
      },
      update: { body: rollsDoc.transcript, documentId: rollsDoc.id },
    });
    await prisma.storyPromptAnswer.upsert({
      where: { id: "answer-circle-meg-rolls" },
      create: {
        id: "answer-circle-meg-rolls",
        promptId: "prompt-sunday-rolls",
        storyId: rollsStory.id,
        authorId: demoUser.id,
      },
      update: { storyId: rollsStory.id },
    });
  }
  if (lilyLiving) {
    await prisma.reunionShift.upsert({
      where: { id: "shift-lily-morning" },
      create: {
        id: "shift-lily-morning",
        familyId: family.id,
        reunionId: "reunion-hart-harvest-2026",
        personId: lilyLiving.id,
        label: "Morning scanner",
        startsAt: "morning",
        notes: "Bring the portable scanner for the harvest letters.",
      },
      update: { label: "Morning scanner", startsAt: "morning" },
    });
  }
  if (margaretLiving) {
    await prisma.reunionShift.upsert({
      where: { id: "shift-margaret-afternoon" },
      create: {
        id: "shift-margaret-afternoon",
        familyId: family.id,
        reunionId: "reunion-hart-harvest-2026",
        personId: margaretLiving.id,
        label: "Afternoon indexer",
        startsAt: "afternoon",
        notes: "Write titles on the new scans.",
      },
      update: { label: "Afternoon indexer", startsAt: "afternoon" },
    });
  }

  await prisma.person.update({
    where: { id: eleanor.id },
    data: { middleName: "Mae" },
  });
  if (lilyLiving) {
    await prisma.person.update({
      where: { id: lilyLiving.id },
      data: { middleName: "Ruth" },
    });
  }
  if (lilyLiving && margaretLiving) {
    await prisma.personName.upsert({
      where: { id: "name-lily-birth" },
      create: {
        id: "name-lily-birth",
        familyId: family.id,
        personId: lilyLiving.id,
        kind: NameKind.birth,
        name: "Lily",
        namedById: margaretLiving.id,
        notes: "Margaret chose Lily after the farm lilies.",
      },
      update: { namedById: margaretLiving.id, name: "Lily" },
    });
  }
  if (margaretLiving && robertLiving) {
    await prisma.willWitness.upsert({
      where: { documentId_personId: { documentId: "doc-samuel-will", personId: margaretLiving.id } },
      create: {
        id: "will-witness-margaret",
        familyId: family.id,
        documentId: "doc-samuel-will",
        personId: margaretLiving.id,
        stoodOn: new Date("2017-11-02"),
        notes: "Stood at the kitchen table.",
      },
      update: { stoodOn: new Date("2017-11-02") },
    });
    await prisma.willWitness.upsert({
      where: { documentId_personId: { documentId: "doc-samuel-will", personId: robertLiving.id } },
      create: {
        id: "will-witness-robert",
        familyId: family.id,
        documentId: "doc-samuel-will",
        personId: robertLiving.id,
        stoodOn: new Date("2017-11-02"),
        notes: "Brought the navy hatband.",
      },
      update: { stoodOn: new Date("2017-11-02") },
    });
  }
  await prisma.familyCrest.upsert({
    where: { id: "crest-hart" },
    create: {
      id: "crest-hart",
      familyId: family.id,
      title: "Hart arms",
      blazon: "Argent, a cottonwood proper, on a chief azure three bees or",
      tincture: "Argent, azure, and or",
      notes: "The bees are Sam's. The cottonwood is the walk home.",
    },
    update: { blazon: "Argent, a cottonwood proper, on a chief azure three bees or" },
  });
  await prisma.familyPhrase.upsert({
    where: { id: "phrase-whitaker" },
    create: {
      id: "phrase-whitaker",
      familyId: family.id,
      phrase: "He called me Whitaker",
      meaning: "A compliment, the way Sam said Eleanor's maiden name",
      language: "English",
      notes: "From the harvest letter.",
    },
    update: { meaning: "A compliment, the way Sam said Eleanor's maiden name" },
  });
  await prisma.document.updateMany({
    where: { id: "doc-harvest" },
    data: { paperMill: "Crane & Co., Dalton", heldById: margaretLiving?.id || null },
  });
  if (eleanorFavorite) {
    await prisma.asset.update({
      where: { id: eleanorFavorite.id },
      data: { sitterId: eleanor.id },
    });
  }
  if (lilyLiving && margaretLiving) {
    await prisma.reunionProgramItem.upsert({
      where: { id: "program-welcome" },
      create: {
        id: "program-welcome",
        familyId: family.id,
        reunionId: "reunion-hart-harvest-2026",
        title: "Welcome under the cottonwoods",
        startsAt: "morning",
        personId: lilyLiving.id,
        notes: "Open the doors.",
      },
      update: { title: "Welcome under the cottonwoods", startsAt: "morning" },
    });
    await prisma.reunionProgramItem.upsert({
      where: { id: "program-grace" },
      create: {
        id: "program-grace",
        familyId: family.id,
        reunionId: "reunion-hart-harvest-2026",
        title: "Grace",
        startsAt: "noon",
        personId: margaretLiving.id,
        notes: "Courtesy to the trees.",
      },
      update: { title: "Grace", startsAt: "noon" },
    });
  }
  if (demoUser) {
    await prisma.letterMarginNote.upsert({
      where: { id: "margin-harvest-whitaker" },
      create: {
        id: "margin-harvest-whitaker",
        familyId: family.id,
        documentId: "doc-harvest",
        authorId: demoUser.id,
        line: 8,
        body: "Mother still told it this way: he called her Whitaker as if it were a compliment.",
      },
      update: { line: 8, body: "Mother still told it this way: he called her Whitaker as if it were a compliment." },
    });
  }
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
  writeMedia(familyId, "harvest-envelope.svg", svgScene("Envelope", "Eleanor Whitaker to Ruth Whitaker", "18 October 1947", "#5c4634"));
  writeWav(familyId, "eleanor-name.wav");
  writeMedia(familyId, "grange-now.svg", svgScene("Grange hall today", "Cedar Falls, the same doors", "2024", "#6b5344"));
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
        middleName: "Mae",
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
        middleName: "Ruth",
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
        writtenAt: person.birthDate,
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
