// Shift Complete grade thresholds — starting points, to be tuned via
// playtesting (see GAME_DESIGN.md §7).
const GRADES: { minScore: number; label: string }[] = [
  { minScore: 800, label: 'Legendary Baker' },
  { minScore: 600, label: 'Gold Bake' },
  { minScore: 400, label: 'Silver Bake' },
  { minScore: 200, label: 'Bronze Bake' },
  { minScore: 0, label: 'New Hire' },
];

export function gradeForScore(score: number): string {
  const grade = GRADES.find((candidate) => score >= candidate.minScore);
  return grade?.label ?? 'New Hire';
}
