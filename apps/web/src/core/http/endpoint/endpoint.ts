import { buildUrl } from 'core/utils';

import { EndpointInterface, EndpointParams } from './endpoint.types';

export class Endpoint<TName extends string = never> implements EndpointInterface<TName> {
  constructor(private readonly _baseUrl: string) {}

  get baseUrl(): string {
    return this._baseUrl;
  }

  toUrl(map?: EndpointParams<TName>): string {
    if (map) {
      return buildUrl(this.baseUrl, map);
    }

    return this.baseUrl;
  }
}
