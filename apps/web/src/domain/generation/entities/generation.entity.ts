import { Generation, GenerationStatus } from 'domain/contracts';
import { getCodeMessage } from 'domain/errors';

/**
 * Одна попытка генерации. Собирается в GenerationDto, который заодно приводит относительный
 * imageUrl к абсолютному адресу API, поэтому дальше про базовый адрес никто не знает.
 */
export class GenerationEntity {
  constructor(
    private readonly _data: Generation,
    readonly imageUrl: string | null,
  ) {}

  get id(): string {
    return this._data.id;
  }

  get nodeId(): string {
    return this._data.nodeId;
  }

  get resultNodeId(): string {
    return this._data.resultNodeId;
  }

  get prompt(): string {
    return this._data.prompt;
  }

  get status(): GenerationStatus {
    return this._data.status;
  }

  get isProcessing(): boolean {
    return this._data.status === 'processing';
  }

  get isSucceeded(): boolean {
    return this._data.status === 'succeeded';
  }

  get isFailed(): boolean {
    return this._data.status === 'failed';
  }

  /**
   * Текст тестового отказа. Отказ — это состояние операции в успешном HTTP-ответе, поэтому
   * его расшифровка живёт здесь, а не в разборе транспорта.
   */
  get failureMessage(): string | null {
    return this.isFailed ? getCodeMessage(this._data.failureCode) : null;
  }
}
