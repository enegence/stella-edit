import { describe, expect, it } from 'vitest';
import { createDefaultAdapters } from '../adapters/defaultAdapters';
import { getAllowedCommands } from '../react/SlashMenu';

describe('adapters', () => {
  it('fails closed for upload when no asset adapter exists', () => {
    expect(createDefaultAdapters().assets.canUpload('image', {}).allowed).toBe(false);
  });

  it('fails closed for internal links when no scope adapter exists', () => {
    expect(createDefaultAdapters().scope.canResolveReference({ type: 'document' }, {}).allowed).toBe(false);
  });

  it('allows read-only rendering without permissions adapter', () => {
    expect(createDefaultAdapters().permissions.canEditDocument({}).allowed).toBe(true);
  });

  it('hides denied slash commands', () => {
    const adapters = createDefaultAdapters({ permissions: { canInsertBlock: (type) => ({ allowed: type !== 'media' }) } });
    expect(getAllowedCommands(adapters, {}, 'media')).toHaveLength(0);
  });
});
