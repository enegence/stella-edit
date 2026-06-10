export function resolveAssetPreview(assetsAdapter, assetId, context) {
  return assetsAdapter?.getAssetPreview?.(assetId, context) || assetsAdapter?.resolveAsset?.(assetId, context) || null;
}
