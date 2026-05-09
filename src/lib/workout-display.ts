type WorkoutNameInput = {
  name?: string | null;
  category?: string | null;
};

export function playerWorkoutProgramName(program: WorkoutNameInput): string {
  if (program.category === "Pro Split" && program.name?.startsWith("Pro Split")) {
    return "Pro Split";
  }

  return program.name ?? "Workout program";
}
