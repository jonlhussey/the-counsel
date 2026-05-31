// Curated word lists for generating memorable two-word slugs.
// Adjective + noun combinations — ~200 × ~200 = 40,000 possibilities.
// Words chosen to feel thoughtful and slightly poetic, matching the app's tone.

const ADJECTIVES = [
  "ancient", "ardent", "brave", "bright", "calm", "candid", "careful",
  "clear", "close", "common", "constant", "cool", "curious", "dark",
  "dear", "deep", "direct", "distant", "earnest", "easy", "empty",
  "even", "fair", "faithful", "fierce", "firm", "free", "fresh",
  "gentle", "golden", "grave", "great", "green", "grounded", "hard",
  "honest", "hopeful", "humble", "inner", "just", "keen", "kind",
  "known", "large", "lasting", "light", "lively", "long", "loud",
  "low", "loyal", "lucid", "mellow", "mild", "moving", "noble",
  "open", "patient", "plain", "present", "proud", "pure", "quiet",
  "radiant", "rare", "real", "resolute", "right", "rising", "rough",
  "round", "sacred", "serene", "sharp", "silent", "simple", "slow",
  "small", "soft", "solid", "steady", "still", "strong", "sudden",
  "sure", "swift", "tender", "thick", "thin", "thorough", "true",
  "trusted", "unfold", "vast", "vivid", "warm", "wide", "wild",
  "willing", "wise", "worthy", "young",
];

const NOUNS = [
  "anchor", "arc", "arrow", "ash", "autumn", "balance", "bench",
  "bond", "branch", "breath", "bridge", "burden", "calm", "candle",
  "canyon", "care", "cedar", "chain", "chamber", "choice", "circle",
  "clarity", "cloud", "compass", "cord", "corner", "courage", "craft",
  "crossing", "crown", "current", "dawn", "debt", "depth", "door",
  "dusk", "earth", "edge", "ember", "field", "fire", "flame",
  "flight", "floor", "fold", "forest", "forge", "form", "frost",
  "garden", "gate", "gift", "grace", "grain", "ground", "grove",
  "gulf", "harbor", "harvest", "haven", "heart", "hearth", "height",
  "horizon", "hour", "house", "hunger", "iron", "island", "journey",
  "kindness", "labor", "lake", "lamp", "land", "lantern", "leaf",
  "ledge", "light", "line", "lodge", "mark", "meadow", "measure",
  "mist", "moment", "moon", "mountain", "note", "oath", "ocean",
  "order", "path", "peace", "pillar", "plain", "pledge", "pool",
  "portal", "purpose", "question", "quiet", "rain", "reach", "reed",
  "reflection", "rest", "ridge", "river", "road", "root", "season",
  "seed", "shadow", "shore", "silence", "sky", "slope", "song",
  "source", "space", "spark", "spring", "star", "stone", "stream",
  "strength", "summit", "thread", "tide", "timber", "tower", "trace",
  "trail", "trust", "truth", "valley", "vessel", "vigil", "voice",
  "water", "wave", "weight", "well", "wind", "wing", "winter", "wood",
];

/**
 * Generate a deterministic two-word slug from a string seed.
 * Same seed always produces the same slug.
 */
export function generateSlug(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  const abs = Math.abs(h);
  const adj = ADJECTIVES[abs % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(abs / ADJECTIVES.length) % NOUNS.length];
  return `${adj}-${noun}`;
}

/**
 * Generate a unique slug by appending a short random suffix if needed.
 * Used when the deterministic slug is already taken in KV.
 */
export function generateUniqueSlug(seed: string, attempt: number = 0): string {
  if (attempt === 0) return generateSlug(seed);
  // Vary the seed on collision
  return generateSlug(`${seed}-${attempt}`);
}
