import { Endpoint } from 'core/http';

/** Единственное место, где живут адреса API. */
export const API = {
  config: new Endpoint('/api/config'),
  spaces: Object.assign(new Endpoint('/api/spaces'), {
    byId: new Endpoint<'spaceId'>('/api/spaces/{spaceId}'),
    generations: Object.assign(new Endpoint<'spaceId'>('/api/spaces/{spaceId}/generations'), {
      byId: new Endpoint<'spaceId' | 'generationId'>(
        '/api/spaces/{spaceId}/generations/{generationId}',
      ),
    }),
    graph: new Endpoint<'spaceId'>('/api/spaces/{spaceId}/graph'),
  }),
};
