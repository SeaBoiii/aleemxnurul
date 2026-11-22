// Words anyone may read, before any answer. Everything personal lives in the vault.

export const legend = [
  'Long ago, a weaver who spun the clouds fell in love with a cowherd.',
  'The heavens pulled them apart. She became Vega, and he became Altair.',
  'They have shone at each other across the sky ever since.',
];

/** One true thing about each star, for anyone who passes it. Keyed by sky.json star key. */
export const starFacts: Record<string, string> = {
  altair: 'The Cowherd. Only 16.7 light-years away, and it spins so fast that it bulges at the middle.',
  tarazed: 'An orange giant beside Altair, hundreds of light-years further out.',
  alshain: 'A star a little like our Sun, about 45 light-years away.',
  'delta-aql': 'A close pair of stars about 50 light-years away, circling each other.',
  okab: 'The tip of the Eagle’s tail, about 83 light-years away.',
  sheliak: 'Two stars so close that they eclipse each other. Its light rises and falls every 12.9 days.',
  sulafat: 'The second-brightest star in the Lyre, a blue-white giant.',
  'delta-lyr': 'A red giant, glowing orange next to a blue star that only looks like its partner.',
  'zeta-lyr': 'A double star: two points of light that binoculars pull apart.',
  'epsilon-lyr': 'The Double Double: a pair of stars, and each of them is a pair again.',
  vega: 'The Weaver Girl, 25 light-years away. Fourteen thousand years ago it was the pole star, and it will be again.',
  fawaris: 'A star still waiting for its night.',
  sadr: 'The heart of the Swan, where the Northern Cross meets, wrapped in glowing gas.',
  albireo: 'The Swan’s beak: a gold star and a blue star, side by side.',
};
