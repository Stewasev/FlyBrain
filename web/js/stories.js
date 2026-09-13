export function stepNeurons(step) {
  return new Set(step.bodyIds || []);
}

export function formatStep(story, index) {
  const step = story.steps[index];
  const stainOnly = Boolean(step.stainOnly) || Boolean(step.select && step.select.stainOnly);
  return {
    story,
    index,
    step,
    label: `${story.title}  ${index + 1}/${story.steps.length}`,
    title: step.title,
    narration: step.narration,
    camera: step.camera || "whole",
    color: step.color || "superclass",
    stainOnly,
    focus: stainOnly ? null : stepNeurons(step),
    skeletonIds: step.showSkeletons ? step.skeletonIds || step.bodyIds || [] : [],
  };
}
