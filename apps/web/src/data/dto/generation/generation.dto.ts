import { Generation } from 'domain/contracts';

/**
 * API отдаёт imageUrl относительным адресом своего хоста. Абсолютный адрес собирается один
 * раз здесь, поэтому компоненты получают готовую ссылку и не знают про базовый адрес API.
 */
export class GenerationDto {
  static mapToEntity(data: Generation, resolve: (path: string) => string): Generation {
    if (data.imageUrl === null) {
      return data;
    }

    return { ...data, imageUrl: resolve(data.imageUrl) };
  }

  static mapToList(data: Generation[], resolve: (path: string) => string): Generation[] {
    return data.map((item) => GenerationDto.mapToEntity(item, resolve));
  }
}
