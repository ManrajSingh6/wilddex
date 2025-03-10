export function formatAnimalName(animal: string): string {
  return animal
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize the first letter of each word
}

export function formatFriendlyTimestamp(timestamp: Date): string {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
