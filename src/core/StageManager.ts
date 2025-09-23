import { StageDefinition, getStageById, stages } from '../config/stages';

let currentStageIndex = 0;
let unlockedStageIndex = 0;

export function getStages(): readonly StageDefinition[] {
  return stages;
}

export function getCurrentStageIndex(): number {
  return currentStageIndex;
}

export function getCurrentStage(): StageDefinition {
  return stages[currentStageIndex];
}

export function setCurrentStageIndex(index: number): void {
  if (index < 0 || index >= stages.length) {
    throw new Error(`Stage index ${index} out of range`);
  }
  currentStageIndex = index;
}

export function isStageUnlocked(index: number): boolean {
  return index <= unlockedStageIndex;
}

export function markStageCompleted(index: number): void {
  if (index < 0 || index >= stages.length) {
    return;
  }
  unlockedStageIndex = Math.min(stages.length - 1, Math.max(unlockedStageIndex, index + 1));
}

export function getStageContext(stageId?: number): { stage: StageDefinition; index: number } {
  if (typeof stageId === 'number') {
    const stage = getStageById(stageId);
    const index = stages.findIndex((entry) => entry.id === stageId);
    return { stage, index: index === -1 ? 0 : index };
  }
  return { stage: getCurrentStage(), index: currentStageIndex };
}

export function resetProgress(): void {
  currentStageIndex = 0;
  unlockedStageIndex = 0;
}
