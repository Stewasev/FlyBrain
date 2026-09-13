export function stepNeurons(step) {
  return new Set(step.bodyIds || []);
}

export function formatStep(story, index) {
  const step = story.steps[index];
  return {
    story,
    index,
    step,
    label: `${story.title}  ${index + 1}/${story.steps.length}`,
    title: step.title,
    narration: step.narration,
    camera: step.camera || "whole",
    color: step.color || "superclass",
    focus: stepNeurons(step),
    skeletonIds: step.showSkeletons ? step.bodyIds || [] : [],
  };
}
