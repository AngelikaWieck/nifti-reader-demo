function readNIFTI(name, data) {
  let slider = document.getElementById("myRange");

  let niftiHeader, niftiImage;
  // parse nifti
  if (nifti.isCompressed(data)) {
    data = nifti.decompress(data);
  }
  if (nifti.isNIFTI(data)) {
    niftiHeader = nifti.readHeader(data);
    niftiImage = nifti.readImage(niftiHeader, data);
  }

  let typedData;
  // convert raw data to typed array based on nifti datatype
  if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
    typedData = new Uint8Array(niftiImage);
  } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
    typedData = new Int16Array(niftiImage);
  } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
    typedData = new Int32Array(niftiImage);
  } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
    typedData = new Float32Array(niftiImage);
  } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
    typedData = new Float64Array(niftiImage);
  } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
    typedData = new Int8Array(niftiImage);
  } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
    typedData = new Uint16Array(niftiImage);
  } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
    typedData = new Uint32Array(niftiImage);
  } else {
    return;
  }

  let min = typedData[0];
  let max = typedData[0];
  for (let i = 0; i < typedData.length; i++) {
    if (typedData[i] < min) min = typedData[i];
    if (typedData[i] > max) max = typedData[i];
  }

  // convert to 8-bit representation that is required for rgba
  let factor = 256 / (max - min);
  for (let i = 0; i < typedData.length; i++) {
    typedData[i] = (typedData[i] - min) * factor;
  }

  // set up slider
  let slices = niftiHeader.dims[3];
  slider.max = slices - 1;
  slider.value = Math.round(slices / 2);
  slider.oninput = function() {
    drawCanvasXY(slider.value | 0, slices, niftiHeader, typedData);
    drawCanvasYZ(slider.value | 0, slices, niftiHeader, typedData);
    drawCanvasXZ(slider.value | 0, slices, niftiHeader, typedData);
  };
  // draw slice
  drawCanvasXY(slider.value | 0, slices, niftiHeader, typedData);
  drawCanvasYZ(slider.value | 0, slices, niftiHeader, typedData);
  drawCanvasXZ(slider.value | 0, slices, niftiHeader, typedData);
}

function drawCanvasXY(slice, slices, niftiHeader, typedData) {
  let canvas = document.getElementById("canvasXY");

  let cols = niftiHeader.dims[1];
  let rows = niftiHeader.dims[2];

  // set canvas dimensions to nifti slice dimensions
  canvas.width = cols;
  canvas.height = rows;

  // make canvas image data
  let ctx = canvas.getContext("2d");
  let canvasImageData = ctx.createImageData(canvas.width, canvas.height);

  // offset to specified slice
  let sliceSize = cols * rows;
  let sliceOffset = sliceSize * slice;

  let canvasImageDataIndex = 0;
  for (let i = sliceOffset; i < sliceOffset + sliceSize; i++) {
    canvasImageData.data[canvasImageDataIndex] = typedData[i]; // r
    canvasImageData.data[canvasImageDataIndex + 1] = typedData[i]; // g
    canvasImageData.data[canvasImageDataIndex + 2] = typedData[i]; // b
    canvasImageData.data[canvasImageDataIndex + 3] = 0xff; // a
    canvasImageDataIndex += 4;
  }
  ctx.putImageData(canvasImageData, 0, 0);
}

function drawCanvasYZ(slice, slices, niftiHeader, typedData) {
  // get nifti dimensions
  let cols = niftiHeader.dims[1];
  let rows = niftiHeader.dims[2];

  let canvas = document.getElementById("canvasYZ");

  // set canvas dimensions to nifti slice dimensions
  canvas.width = niftiHeader.dims[2];
  canvas.height = niftiHeader.dims[3];
  // make canvas image data
  let ctx = canvas.getContext("2d");

  // width and height anpassen
  let canvasImageData = ctx.createImageData(canvas.width, canvas.height);

  // offset to specified slice
  let sliceSize = cols * rows;
  let sliceOffset = sliceSize * slice;

  let canvasImageDataIndex = 0;
  for (let i = slice; i < sliceSize * slices; i += cols) {
    canvasImageData.data[canvasImageDataIndex] = typedData[i];
    canvasImageData.data[canvasImageDataIndex + 1] = typedData[i];
    canvasImageData.data[canvasImageDataIndex + 2] = typedData[i];
    canvasImageData.data[canvasImageDataIndex + 3] = 0xff;
    canvasImageDataIndex += 4;
  }

  ctx.putImageData(canvasImageData, 0, 0);
}

function drawCanvasXZ(slice, slices, niftiHeader, typedData) {
  // get nifti dimensions
  let cols = niftiHeader.dims[1];
  let rows = niftiHeader.dims[2];

  let canvas = document.getElementById("canvasXZ");

  // set canvas dimensions to nifti slice dimensions
  canvas.width = niftiHeader.dims[1];
  canvas.height = niftiHeader.dims[3];
  // make canvas image data
  let ctx = canvas.getContext("2d");

  // width and height anpassen
  let canvasImageData = ctx.createImageData(canvas.width, canvas.height);

  // offset to specified slice
  let sliceSize = cols * rows;
  let sliceOffset = sliceSize * slice;

  let canvasImageDataIndex = 0;
  for (let i = 0; i < sliceSize * slices; i += sliceSize) {
    for (
      let k = sliceSize - slice * cols;
      k < sliceSize - slice * cols + cols;
      k++
    ) {
      canvasImageData.data[canvasImageDataIndex] = typedData[k + i];
      canvasImageData.data[canvasImageDataIndex + 1] = typedData[k + i];
      canvasImageData.data[canvasImageDataIndex + 2] = typedData[k + i];
      canvasImageData.data[canvasImageDataIndex + 3] = 0xff;
      canvasImageDataIndex += 4;
    }
  }

  ctx.putImageData(canvasImageData, 0, 0);
}

function readFile(file) {
  let reader = new FileReader();
  reader.onloadend = function(evt) {
    if (evt.target.readyState === FileReader.DONE) {
      readNIFTI(file.name, evt.target.result);
    }
  };
  reader.readAsArrayBuffer(file);
}
function handleFileSelect(evt) {
  let files = evt.target.files;
  readFile(files[0]);
}
