function readFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = evt => {
      resolve(reader.result);
    };
    reader.onerror = evt => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
}

class NIFTIImage {
  static async readFile(file) {
    const data = await readFile(file);
    return this.parseData(data);
  }

  static parseData(data) {
    if (nifti.isCompressed(data)) {
      data = nifti.decompress(data);
    }
    if (!nifti.isNIFTI(data)) {
      throw new Error("This is not a NIFTI image!!");
    }
    let header = nifti.readHeader(data);
    let image = nifti.readImage(header, data);
    return new this(header, image);
  }

  constructor(header, image) {
    this.header = header;
    this.image = image;

    let typedData;
    // convert raw data to typed array based on nifti datatype
    if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
      typedData = new Uint8Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
      typedData = new Int16Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
      typedData = new Int32Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
      typedData = new Float32Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
      typedData = new Float64Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
      typedData = new Int8Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
      typedData = new Uint16Array(image);
    } else if (header.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
      typedData = new Uint32Array(image);
    } else {
      return;
    }

    let min = typedData[0];
    let max = typedData[0];
    for (let i = 0; i < typedData.length; i++) {
      if (typedData[i] < min) min = typedData[i];
      if (typedData[i] > max) max = typedData[i];
    }

    let factor = 256 / (max + 1 - min);
    let data = new Uint8Array(typedData.length);
    for (let i = 0; i < typedData.length; i++) {
      data[i] = (typedData[i] - min) * factor;
    }

    this.data = data;
  }
}

class SliceView {
  constructor(canvas, image) {
    this.canvas = canvas;
    this.image = null;
    this.ctx = null;
    if (image) {
      this.setImage(image);
    }
  }

  get dims() {
    return this.image.header.dims;
  }

  get cols() {
    return this.dims[1];
  }

  get rows() {
    return this.dims[2];
  }

  get slices() {
    return this.dims[3];
  }

  get canvasDim() {
    throw new Error("No canvasDim getter, because this is the super class");
  }

  setImage(image) {
    this.image = image;
    // set canvas dimensions to nifti slice dimensions
    const [width, height] = this.canvasDim;
    this.canvas.width = width;
    this.canvas.height = height;

    // make canvas image data
    this.ctx = this.canvas.getContext("2d");
  }

  innerUpdate() {
    throw new Error("No innerUpdate function, because this is the super class");
  }

  update(slice) {
    let canvasImageData = this.ctx.createImageData(
      this.canvas.width,
      this.canvas.height
    );

    this.innerUpdate(canvasImageData, slice);

    this.ctx.putImageData(canvasImageData, 0, 0);
  }
}

class SliceViewXY extends SliceView {
  get canvasDim() {
    return [this.cols, this.rows];
  }

  innerUpdate(canvasImageData, slice) {
    let sliceSize = this.cols * this.rows;
    let sliceOffset = sliceSize * slice;

    let canvasImageDataIndex = 0;
    for (let i = sliceOffset; i < sliceOffset + sliceSize; i++) {
      canvasImageData.data[canvasImageDataIndex] = this.image.data[i]; // r
      canvasImageData.data[canvasImageDataIndex + 1] = this.image.data[i]; // g
      canvasImageData.data[canvasImageDataIndex + 2] = this.image.data[i]; // b
      canvasImageData.data[canvasImageDataIndex + 3] = 0xff; // a
      canvasImageDataIndex += 4;
    }
  }
}

class SliceViewYZ extends SliceView {
  get canvasDim() {
    return [this.rows, this.slices];
  }

  innerUpdate(canvasImageData, slice) {
    let sliceSize = this.cols * this.rows;

    let canvasImageDataIndex = 0;
    for (let i = slice; i < sliceSize * this.slices; i += this.cols) {
      canvasImageData.data[canvasImageDataIndex] = this.image.data[i];
      canvasImageData.data[canvasImageDataIndex + 1] = this.image.data[i];
      canvasImageData.data[canvasImageDataIndex + 2] = this.image.data[i];
      canvasImageData.data[canvasImageDataIndex + 3] = 0xff;
      canvasImageDataIndex += 4;
    }
  }
}

class SliceViewXZ extends SliceView {
  get canvasDim() {
    return [this.cols, this.slices];
  }

  innerUpdate(canvasImageData, slice) {
    let sliceSize = this.cols * this.rows;

    let canvasImageDataIndex = 0;
    for (let i = 0; i < sliceSize * this.slices; i += sliceSize) {
      for (
        let k = sliceSize - slice * this.cols;
        k < sliceSize - slice * this.cols + this.cols;
        k++
      ) {
        canvasImageData.data[canvasImageDataIndex] = this.image.data[k + i];
        canvasImageData.data[canvasImageDataIndex + 1] = this.image.data[k + i];
        canvasImageData.data[canvasImageDataIndex + 2] = this.image.data[k + i];
        canvasImageData.data[canvasImageDataIndex + 3] = 0xff;
        canvasImageDataIndex += 4;
      }
    }
  }
}

async function handleFileSelect(event) {
  let slider = document.getElementById("myRange");

  const image = await NIFTIImage.readFile(event.target.files[0]);

  let sliceViewXY = new SliceViewXY(document.getElementById("canvasXY"), image);
  let sliceViewYZ = new SliceViewYZ(document.getElementById("canvasYZ"), image);
  let sliceViewXZ = new SliceViewXZ(document.getElementById("canvasXZ"), image);

  // set up slider
  let slices = image.header.dims[3];
  slider.max = slices - 1;
  slider.value = Math.round(slices / 2);
  slider.oninput = function() {
    sliceViewXY.update(slider.value | 0);
    sliceViewYZ.update(slider.value | 0);
    sliceViewXZ.update(slider.value | 0);
  };
  // draw slice
  sliceViewXY.update(slider.value | 0);
  sliceViewYZ.update(slider.value | 0);
  sliceViewXZ.update(slider.value | 0);
}
