export interface Course {
  id: string; // UUID
  courseCode: string; // e.g., "DAT101", "MAT270"
  name: string;
  description: string;
  time_slot: 1 | 2 | 3 | 4;
  enrolled: boolean;
  score?: string;
}
