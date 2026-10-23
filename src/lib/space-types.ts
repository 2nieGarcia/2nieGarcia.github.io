export type Passage = {
  id: string;
  slug: string;
  title: string;
  area: string;
  href: string;
  text: string;
  vec: number[];
};

export type Space = { model: string; passages: Passage[] };
