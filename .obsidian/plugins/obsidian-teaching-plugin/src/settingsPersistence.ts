function normalizeFolderPath(folderPath: string): string {
  return folderPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function shouldRebuildIndex(
  currentFolderPath: string,
  nextFolderPath: string,
): boolean {
  return normalizeFolderPath(currentFolderPath) !== normalizeFolderPath(nextFolderPath);
}
