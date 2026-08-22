import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Automatically compresses and downscales any camera or gallery photo
 * Resizes dimensions to max width 800px and returns a lightweight Base64 Data URI (~35KB-50KB).
 */
export async function processImageToWebP(uri: string): Promise<string> {
  try {
    // 1. Try WebP compression first
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 640 } }],
        {
          compress: 0.45,
          format: ImageManipulator.SaveFormat.WEBP,
          base64: true,
        }
      );
      if (manipResult.base64) {
        return `data:image/webp;base64,${manipResult.base64}`;
      }
    } catch (webpErr) {
      console.warn('[ImageUtils] WebP encoding notice, falling back to JPEG:', webpErr);
    }

    // 2. Guaranteed universal JPEG fallback
    const jpegResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 640 } }],
      {
        compress: 0.4,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (jpegResult.base64) {
      return `data:image/jpeg;base64,${jpegResult.base64}`;
    }
    return jpegResult.uri;
  } catch (err) {
    console.error('[ImageUtils] Image manipulation error:', err);
    return uri;
  }
}
