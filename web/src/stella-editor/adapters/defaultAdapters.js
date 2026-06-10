const allowed = { allowed: true };
const denied = (reason) => ({ allowed: false, reason });

export function createDefaultAdapters(overrides = {}) {
  return {
    permissions: {
      canEditDocument: () => allowed,
      canInsertBlock: () => allowed,
      canUseFormatting: () => allowed,
      canUploadAsset: () => denied('No asset upload adapter is configured.'),
      canLinkToTarget: () => denied('No scoped link adapter is configured.'),
      canExport: () => allowed,
      ...overrides.permissions
    },
    scope: {
      getCurrentScope: () => null,
      canResolveReference: () => denied('No scope adapter is configured.'),
      normalizeReference: (reference) => reference,
      isReferenceVisible: () => false,
      ...overrides.scope
    },
    links: {
      searchLinkTargets: () => [],
      resolveLink: () => null,
      getHref: (reference) => (reference?.kind === 'external_url' ? reference.href : null),
      getDisplayLabel: (reference) => reference?.label || reference?.href || '',
      getPreview: () => null,
      ...overrides.links
    },
    assets: {
      canUpload: () => denied('No asset adapter is configured.'),
      pickAsset: () => null,
      uploadAsset: () => null,
      resolveAsset: () => null,
      getAssetPreview: () => null,
      removeAssetReference: () => null,
      ...overrides.assets
    },
    autocomplete: {
      searchCommands: () => [],
      searchReferences: () => [],
      searchAssets: () => [],
      ...overrides.autocomplete
    }
  };
}
