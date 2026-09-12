import { Space } from 'domain/contracts';
import { SpaceEntity } from 'domain/space/entities';

export class SpaceDto {
  static mapToEntity(data: Space): SpaceEntity {
    return new SpaceEntity(data);
  }

  static mapToList(data: Space[]): SpaceEntity[] {
    return data.map(SpaceDto.mapToEntity);
  }
}
