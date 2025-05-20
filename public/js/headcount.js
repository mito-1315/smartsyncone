let model;

async function loadModel() {
  model = await blazeface.load();
  console.log('BlazeFace model loaded');
}

async function getHeadCount(imageElement) {
  if (!model) {
    throw new Error('Model not loaded');
  }

  const returnTensors = false;
  const predictions = await model.estimateFaces(imageElement, returnTensors);
  return predictions.length;
}

export { loadModel, getHeadCount };
