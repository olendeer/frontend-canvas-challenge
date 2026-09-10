export const buildUrl = (template: string, params: Record<string, string>): string =>
  Object.entries(params).reduce(
    (url, [name, value]) => url.replace(`{${name}}`, encodeURIComponent(value)),
    template,
  );
