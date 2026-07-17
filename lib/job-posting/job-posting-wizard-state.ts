export function getJobPostingWizardStepState(stepId: number, currentStep: number) {
  return {
    isActive: stepId === currentStep,
    isDone: stepId < currentStep,
    isFuture: stepId > currentStep,
  }
}
