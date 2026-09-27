import JSZip from 'jszip';
import { ArchiveEntry, ProjectInspection } from '../../types/archive';
import { computeRepoPaths, detectProjectRoot } from './rootDetector';
import { validateArchive } from './validator';

export class ArchivePackage {
  public zip: JSZip;
  public fileName: string;
  public fileSizeBytes: number;
  public rawEntries: ArchiveEntry[] = [];
  public inspection!: ProjectInspection;

  private constructor(zip: JSZip, fileName: string, fileSizeBytes: number) {
    this.zip = zip;
    this.fileName = fileName;
    this.fileSizeBytes = fileSizeBytes;
  }

  public static async fromFile(file: File): Promise<ArchivePackage> {
    const arrayBuffer = await file.arrayBuffer();
    return ArchivePackage.fromArrayBuffer(arrayBuffer, file.name, file.size);
  }

  public static async fromArrayBuffer(
    buffer: ArrayBuffer,
    fileName: string,
    fileSizeBytes: number
  ): Promise<ArchivePackage> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer, {
        checkCRC32: true,
      });
    } catch (err: any) {
      throw new Error(`Corrupted or invalid ZIP archive: ${err.message || 'Failed to parse ZIP format'}`);
    }

    const archive = new ArchivePackage(zip, fileName, fileSizeBytes);
    archive.inspectArchive();
    return archive;
  }

  private inspectArchive(): void {
    const rawPaths: string[] = [];
    const entries: ArchiveEntry[] = [];

    this.zip.forEach((relativePath, zipObject) => {
      // Normalize slashes
      const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!normalized) return;

      rawPaths.push(normalized);

      // JSZip object _data might have size or uncompressedSize
      const uncompressedSize = (zipObject as any)._data?.uncompressedSize ?? 0;
      const compressedSize = (zipObject as any)._data?.compressedSize ?? 0;

      entries.push({
        path: relativePath,
        normalizedPath: normalized,
        repoPath: normalized, // temporary, will be updated by computeRepoPaths
        size: uncompressedSize,
        compressedSize: compressedSize,
        isDirectory: zipObject.dir || normalized.endsWith('/'),
        date: zipObject.date || new Date(),
      });
    });

    this.rawEntries = entries;

    // Detect Root
    const rootInfo = detectProjectRoot(rawPaths);
    const useRootStripping = rootInfo.hasWrapperFolder;

    // Compute repo paths
    const entriesWithRepoPaths = computeRepoPaths(entries, useRootStripping, rootInfo.detectedRoot);

    // Run initial validation
    const validation = validateArchive(entriesWithRepoPaths, this.fileSizeBytes);

    const filesOnly = entriesWithRepoPaths.filter((e) => !e.isDirectory && e.repoPath.length > 0);

    this.inspection = {
      fileName: this.fileName,
      fileSizeBytes: this.fileSizeBytes,
      entries: entriesWithRepoPaths,
      filesOnly,
      rootInfo,
      validation,
      useRootStripping,
    };
  }

  public updateRootStripping(strip: boolean): ProjectInspection {
    const entriesWithRepoPaths = computeRepoPaths(
      this.rawEntries,
      strip,
      this.inspection.rootInfo.detectedRoot
    );

    const validation = validateArchive(entriesWithRepoPaths, this.fileSizeBytes);
    const filesOnly = entriesWithRepoPaths.filter((e) => !e.isDirectory && e.repoPath.length > 0);

    this.inspection = {
      ...this.inspection,
      entries: entriesWithRepoPaths,
      filesOnly,
      validation,
      useRootStripping: strip,
    };

    return this.inspection;
  }

  /**
   * Lazily loads file content as Base64 when needed for blob upload.
   * This ensures minimal memory consumption even for large repositories.
   */
  public async getFileBase64(entryPath: string): Promise<string> {
    const file = this.zip.file(entryPath);
    if (!file) {
      throw new Error(`File "${entryPath}" not found in archive.`);
    }
    return await file.async('base64');
  }

  /**
   * Lazily loads file content as UTF-8 text if needed for inspection.
   */
  public async getFileText(entryPath: string): Promise<string> {
    const file = this.zip.file(entryPath);
    if (!file) {
      throw new Error(`File "${entryPath}" not found in archive.`);
    }
    return await file.async('text');
  }
}
