const MAX_IMAGE_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "El archivo debe ser una imagen JPG, PNG, WebP o GIF.";
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return "La imagen no debe superar 2 MB.";
  }

  return null;
}
