/**
 * Simple hash function to convert a string to a number
 * Uses the djb2 algorithm
 */
export const hashString = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

/**
 * Get a deterministic color for a given string
 * Always returns the same color for the same input
 */
export const getColorForString = (str: string, colors: string[]): string => {
  const hash = hashString(str);
  const index = hash % colors.length;
  return colors[index];
};
