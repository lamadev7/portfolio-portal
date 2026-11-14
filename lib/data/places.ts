export type PlaceKind = "home" | "city" | "heritage" | "nature" | "trek" | "ride" | "viewpoint" | "dream";

export interface Place {
  id: string;
  name: string;
  region: string;
  country: string;
  /** ISO 3166-1 numeric, as used for world-atlas feature ids (Nepal = "524"). */
  iso: string;
  /** [longitude, latitude] */
  ll: [number, number];
  kind: PlaceKind;
  line: string;
  when?: string;
  altitude?: number;
  photo?: string;
  camera?: { zoom: number; pitch: number; bearing: number };
  draft?: boolean;
}

/** Kathmandu: origin of the great-circle arcs to places abroad. */
export const HOME_LL: [number, number] = [85.324, 27.7172];

export const NEPAL_ISO = "524";

export const KIND_LABEL: Record<PlaceKind, string> = {
  home: "Home",
  city: "City",
  heritage: "Heritage",
  nature: "Nature",
  trek: "Trek",
  ride: "Ride",
  viewpoint: "Viewpoint",
  dream: "Next summit",
};

export const places: Place[] = [
  {
    id: "sarlahi",
    name: "Sarlahi",
    region: "Madhesh Province",
    country: "Nepal",
    iso: "524",
    ll: [85.5606, 26.9617],
    kind: "home",
    line: "Where every trip starts — paddy and mustard fields, flat horizons, long Terai sunsets.",
    camera: { zoom: 11.6, pitch: 62, bearing: 8 },
  },
  {
    id: "chitwan",
    name: "Chitwan National Park",
    region: "Bagmati Province",
    country: "Nepal",
    iso: "524",
    ll: [84.4333, 27.5],
    kind: "nature",
    line: "Sal forest and riverine grassland in the inner Terai, home to the greater one-horned rhino and the Bengal tiger. A UNESCO World Heritage Site since 1984.",
    camera: { zoom: 10.6, pitch: 64, bearing: 20 },
  },
  {
    id: "lumbini",
    name: "Lumbini",
    region: "Lumbini Province",
    country: "Nepal",
    iso: "524",
    ll: [83.276, 27.4692],
    kind: "heritage",
    line: "Birthplace of Siddhartha Gautama, the Buddha, marked by the Maya Devi Temple and its monastic zone. A UNESCO World Heritage Site.",
    camera: { zoom: 14.6, pitch: 55, bearing: 0 },
  },
  {
    id: "kathmandu",
    name: "Kathmandu",
    region: "Bagmati Province",
    country: "Nepal",
    iso: "524",
    ll: [85.324, 27.7172],
    kind: "city",
    line: "Home since 2019, when I moved up from the Terai for college. A bowl of a valley ringed by green hills.",
    when: "Since 2019",
    camera: { zoom: 11.8, pitch: 64, bearing: 15 },
  },
  {
    id: "swayambhunath",
    name: "Swayambhunath",
    region: "Kathmandu",
    country: "Nepal",
    iso: "524",
    ll: [85.2904, 27.7149],
    kind: "heritage",
    line: "Hilltop stupa on the western edge of the valley, part of the Kathmandu Valley UNESCO World Heritage Site.",
    camera: { zoom: 14.8, pitch: 60, bearing: 70 },
  },
  {
    id: "patan",
    name: "Patan / Lalitpur",
    region: "Bagmati Province",
    country: "Nepal",
    iso: "524",
    ll: [85.3253, 27.6727],
    kind: "city",
    line: "The old city of Newar craft and temples around Patan Durbar Square. Where I work, at PortPro.",
    when: "Since 2022",
    camera: { zoom: 15, pitch: 56, bearing: 10 },
  },
  {
    id: "rani-pokhari",
    name: "Rani Pokhari",
    region: "Kathmandu",
    country: "Nepal",
    iso: "524",
    ll: [85.3157, 27.708],
    kind: "heritage",
    line: "The 17th-century Queen's Pond in central Kathmandu, built by King Pratap Malla, with the Balgopaleshwar temple on its island.",
    camera: { zoom: 15.6, pitch: 50, bearing: 0 },
  },
  {
    id: "namobuddha",
    name: "Namobuddha",
    region: "Kavrepalanchok",
    country: "Nepal",
    iso: "524",
    ll: [85.5856, 27.5706],
    kind: "heritage",
    line: "Buddhist pilgrimage hill south-east of the valley, with a stupa and the Thrangu Tashi Yangtse Monastery on the ridge.",
    camera: { zoom: 14.2, pitch: 66, bearing: 30 },
  },
  {
    id: "kalinchowk",
    name: "Kalinchowk",
    region: "Dolakha",
    country: "Nepal",
    iso: "524",
    ll: [86.0385, 27.7765],
    kind: "viewpoint",
    line: "Ridge-top shrine of Kalinchowk Bhagwati, with a wide view across to the Rolwaling and Gaurishankar Himalaya.",
    altitude: 3842,
    camera: { zoom: 11.8, pitch: 76, bearing: 50 },
  },
  {
    id: "everest-base-camp",
    name: "Everest Base Camp",
    region: "Solukhumbu",
    country: "Nepal",
    iso: "524",
    ll: [86.8528, 28.0026],
    kind: "dream",
    line: "The next summit I'm aiming for: the Khumbu trail to base camp, below the Khumbu Icefall. Not visited yet.",
    altitude: 5364,
    camera: { zoom: 12.2, pitch: 74, bearing: 100 },
  },
  {
    id: "draft-abroad-1",
    name: "[CITY]",
    region: "[REGION]",
    country: "[COUNTRY]",
    iso: "356",
    ll: [77.209, 28.6139],
    kind: "city",
    line: "[One line about this trip]",
    when: "[YEAR]",
    camera: { zoom: 10.5, pitch: 55, bearing: 0 },
    draft: true,
  },
  {
    id: "draft-abroad-2",
    name: "[CITY]",
    region: "[REGION]",
    country: "[COUNTRY]",
    iso: "764",
    ll: [100.5018, 13.7563],
    kind: "city",
    line: "[One line about this trip]",
    when: "[YEAR]",
    camera: { zoom: 10.5, pitch: 55, bearing: 0 },
    draft: true,
  },
  {
    id: "draft-abroad-3",
    name: "[PLACE]",
    region: "[REGION]",
    country: "[COUNTRY]",
    iso: "392",
    ll: [138.7274, 35.3606],
    kind: "nature",
    line: "[One line about this trip]",
    when: "[YEAR]",
    camera: { zoom: 11, pitch: 70, bearing: 0 },
    draft: true,
  },
];

/** Places to render; drafts only appear outside production so the globe and arcs can be previewed. */
export function publishedPlaces(): Place[] {
  return process.env.NODE_ENV === "production" ? places.filter((p) => !p.draft) : places;
}

/** Countries with at least one visited (non-dream) published place. */
export function visitedCountryIsos(list: Place[] = publishedPlaces()): string[] {
  return Array.from(new Set(list.filter((p) => p.kind !== "dream").map((p) => p.iso)));
}
