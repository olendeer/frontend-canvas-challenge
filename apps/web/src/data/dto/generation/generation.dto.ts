import { Generation } from 'domain/contracts';
import { GenerationEntity, GenerationsEntity } from 'domain/generation/entities';

/**
 * API отдаёт imageUrl относительным адресом своего хоста. Абсолютный адрес собирается один
 * раз здесь, поэтому компоненты получают готовую ссылку и не знают про базовый адрес API.
 */
export class GenerationDto {
  static mapToEntity(data: Generation, resolve: (path: string) => string): GenerationEntity {
    return new GenerationEntity(data, data.imageUrl === null ? null : resolve(data.imageUrl));
  }

  static mapToList(data: Generation[], resolve: (path: string) => string): GenerationsEntity {
    return new GenerationsEntity(data.map((item) => GenerationDto.mapToEntity(item, resolve)));
  }
}
