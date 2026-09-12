/**
 * Настройки бэкенда из GET /api/config. Значения по умолчанию совпадают с серверными и
 * используются, пока настройки не загрузились, поэтому у канваса нет «пустого» состояния.
 */
export class ConfigEntity {
  private static _defaults: ConfigEntity | null = null;

  constructor(
    readonly debounceMs: number,
    readonly pollIntervalMs: number,
    readonly generationDelayMs: number,
    readonly maxNodes: number,
    readonly maxEdges: number,
  ) {}

  /** Один экземпляр на всё приложение: ссылка стабильна между перерисовками. */
  static defaults(): ConfigEntity {
    ConfigEntity._defaults ??= new ConfigEntity(500, 500, 1500, 20, 20);

    return ConfigEntity._defaults;
  }

  /** Настройки сервера, если они уже загружены, иначе значения по умолчанию. */
  static resolve(config?: ConfigEntity | null): ConfigEntity {
    return config ?? ConfigEntity.defaults();
  }
}
