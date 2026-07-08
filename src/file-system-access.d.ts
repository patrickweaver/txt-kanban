// Ambient types for the WICG File System Access API entry points that are
// not yet in TypeScript's DOM lib. FileSystemFileHandle, createWritable, and
// FileSystemWritableFileStream are already typed there.
// No top-level import/export: these interfaces must merge into the global scope.

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
  id?: string;
}

interface Window {
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}

interface FileSystemHandle {
  queryPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
}
