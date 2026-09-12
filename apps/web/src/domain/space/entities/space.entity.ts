import { Space } from 'domain/contracts';

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });

/** Рабочее пространство: данные ресурса и их представление для интерфейса. */
export class SpaceEntity {
  constructor(private readonly _data: Space) {}

  get id(): string {
    return this._data.id;
  }

  get title(): string {
    return this._data.title;
  }

  get createdAt(): string {
    return this._data.createdAt;
  }

  /** Дата создания в локальном формате: одно место вместо форматирования в компоненте. */
  get createdAtLabel(): string {
    return dateFormat.format(new Date(this._data.createdAt));
  }
}
