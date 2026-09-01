// src/utils/pdfExport.js
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

export async function exportPdfDirect(doc, filename) {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const dataUri = doc.output("datauristring");
    const base64Data = dataUri.split(",")[1];

    try {
      try {
        await Filesystem.requestPermissions();
      } catch {}

      // 1. Try writing directly to Download on Android External Storage
      const res = await Filesystem.writeFile({
        path: `Download/${filename}`,
        data: base64Data,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
      return { success: true, isNative: true, path: res.uri };
    } catch (e1) {
      // 2. Fallback: Write directly to Documents directory
      try {
        const res = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        return { success: true, isNative: true, path: res.uri };
      } catch (e2) {
        console.warn("Native file write failed, using browser save:", e2);
      }
    }
  }

  // 3. Desktop / Browser download fallback
  doc.save(filename);
  return { success: true, isNative: false };
}
