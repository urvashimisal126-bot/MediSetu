const MAX_DIMENSION = 1600;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function compressPrescriptionImage(file) {
  if (!file) throw new Error("No file selected.");

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error("Please upload a JPG or PNG image of your prescription.");
  }

  const originalBytes = file.size;

  // Load image into an HTMLImageElement via ObjectURL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This file does not appear to be a valid image."));
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  );

  if (!blob) {
    throw new Error("Could not optimize the image before upload.");
  }

  if (blob.size > MAX_BYTES) {
    throw new Error("Image is still larger than 5 MB after compression. Please use a smaller photo.");
  }

  const compressedName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const compressedFile = new File([blob], compressedName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    previewUrl: dataUrl,
    originalKb: Math.max(1, Math.round(originalBytes / 1024)),
    compressedKb: Math.max(1, Math.round(blob.size / 1024)),
  };
}
