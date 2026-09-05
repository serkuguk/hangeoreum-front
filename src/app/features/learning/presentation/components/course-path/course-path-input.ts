export interface CoursePathInput {
  units: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      type: 'ALPHABET' | 'GRAMMAR' | 'LESSON' | 'STORY';
      status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
      hasAccess: boolean;
      score: number | null;
      xpReward: number;
    }>;
  }>;
}
