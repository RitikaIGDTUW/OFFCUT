/**
 * Real photos from Unsplash (free licence), grouped by theme. Every ID here was checked to
 * return an image (see README → "Verifying images"). Used by the seed script and homepage.
 */
const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const ids = {
  leather: [
    "1778882996728-952ed23dc6f4",
    "1778882996716-72c204e3e14b",
    "1778883004138-f6eacbfdbef9",
    "1778882999785-9e75a2207d0c",
    "1762380831526-c5205ee367c6",
    "1778883004941-a8b1f9d085cc",
    "1778883007756-dab8d4692c5e",
    "1628483211662-9bcc692c46dc",
  ],
  textiles: [
    "1771098403201-8d0d32e2a062",
    "1776539788649-365595327e68",
    "1771098403216-ca0c3c2858c0",
    "1534639077088-d702bcf685e7",
    "1705250466297-90035b3a2b26",
    "1640767760729-7bfb6ce43ad4",
    "1631112230741-446762ee05ac",
    "1770795263937-cf927f63c001",
    "1637004732258-4b792ce8f474",
    "1675784332655-675d1a1ddcf6",
  ],
  textileMill: ["1757852636019-711d501cc50c", "1758269445774-61a540a290a6", "1610891015188-5369212db097"],
  metals: [
    "1667892702884-faa077e80d7b",
    "1697698532634-ea59b636ccea",
    "1501166222995-ff31c7e93cef",
    "1519634093379-625390ebebc7",
    "1656055448515-41d4b1163f4c",
    "1763950865631-4ca11bebe017",
    "1550979967-5839959d4cbc",
    "1694827893591-af9b80361599",
    "1780037125185-8b43be71eed9",
  ],
  machining: [
    "1740209475472-aa7d280f7452",
    "1666634157070-6fd830fb5672",
    "1764114235891-66ff86abaf87",
    "1769147339214-076740872485",
    "1504917595217-d4dc5ebe6122",
  ],
  wood: [
    "1506968430777-bf7784a87f23",
    "1546484396-fb3fc6f95f98",
    "1597113366853-fea190b6cd82",
    "1611072337226-1140ab367200",
    "1659259396550-c34facca2277",
    "1634672652995-ee7525bce595",
    "1784397375428-7a2c2e781d84",
    "1422246654994-34520d5a0340",
    "1644931551533-02906718127f",
    "1590635022668-81cc8696a19d",
  ],
  stone: [
    "1587749158407-58ef2b89ccf8",
    "1786673211682-3653b8a424e5",
    "1786673208615-8847e4547cd4",
    "1786673218600-b44d3e7936b6",
    "1789659529666-1d94bbc60381",
    "1762087483751-a283e113c52c",
    "1759150467207-1d4870e074fc",
  ],
  plastics: [
    "1744056996022-c33f1cc49030",
    "1787502281378-26b71d3b5ede",
    "1790746717531-d30e790ccea7",
    "1610562966490-fbee642e7821",
    "1679485205984-4ce35c32b2d6",
  ],
  composites: ["1758563920442-280b4e7afe7a", "1763075958748-9a0c9c8799c3", "1771582979378-67e79263a54f"],
  cork: [
    "1558051815-0f18e64e6280",
    "1790934422050-013b2365a075",
    "1707255020855-9bbd51f99608",
    "1640930828955-3acc359cdced",
    "1590923801255-05c5e06536f4",
    "1578499177313-0416e8f509e6",
  ],
  glass: [
    "1543817625-3cbb6d1a6e32",
    "1565105337533-d23f47c0fd58",
    "1545584483-4e534635823b",
    "1725824958035-9da8d4a1465b",
  ],
  hardware: [
    "1613945831677-383c19ad7721",
    "1564226591723-659ff3852b2a",
    "1562936291-bfe45093d49c",
    "1703868671123-3deab40f66c4",
    "1529255848089-c4e456d166e0",
  ],
  workshop: [
    "1659930087003-2d64e33181f7",
    "1788296817269-8df0458ab799",
    "1547609434-b732edfee020",
    "1497219055242-93359eeed651",
    "1779031242515-205111711b23",
    "1497218770144-3fea6dbc33fe",
  ],
  tailor: [
    "1718184021018-d2158af6b321",
    "1791962831671-c869576205f0",
    "1764298493231-59ae059cdc7e",
    "1788026661669-18946e6260d4",
    "1793519060897-0e34014eb711",
  ],
  architecture: [
    "1787742837882-1d32e269aafe",
    "1782879549420-7cd9dc53d334",
    "1772442198907-765685249ea4",
    "1771344163986-5219fb12005b",
    "1624066969616-69b0b0301d4d",
  ],
} as const;

export type ImageTheme = keyof typeof ids;
export const IMAGE_IDS = ids;

export const img = (theme: ImageTheme, i = 0, w = 1600) => u(ids[theme][i % ids[theme].length], w);
export const imgs = (theme: ImageTheme, w = 1600) => ids[theme].map((id) => u(id, w));

/** Homepage hero collage + "Who it's for" photos. */
export const HERO_IMAGES = [img("leather", 0), img("metals", 0), img("textiles", 0), img("wood", 2)];
export const AUDIENCE_IMAGES = {
  makers: img("workshop", 0, 900),
  students: img("architecture", 0, 900),
  tailors: img("tailor", 0, 900),
  architects: img("architecture", 2, 900),
};
export const STORY_IMAGES = { mill: img("textileMill", 0, 1400), machining: img("machining", 0, 1400) };
