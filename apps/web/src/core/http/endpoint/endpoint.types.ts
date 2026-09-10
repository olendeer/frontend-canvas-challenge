export type EndpointParams<TName extends string> = Record<TName, string>;

export interface EndpointInterface<TName extends string = never> {
  readonly baseUrl: string;

  toUrl(map?: EndpointParams<TName>): string;
}
