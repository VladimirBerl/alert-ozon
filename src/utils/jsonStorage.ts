import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import isEqual from 'lodash.isequal';

type JsonValue = Record<string, any> | any[];

export default class JsonStorage<T extends JsonValue = any[]> {
  private filePath: string;

  constructor(relativePath: string, type: 'object' | 'array' = 'array') {
    this.filePath = path.resolve(`./json/${relativePath}`);
    const dir = path.dirname(this.filePath);

    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(this.filePath)) writeFileSync(this.filePath, type === 'object' ? '{}' : '[]', 'utf8');
  }

  /** Читает данные из файла (массив или объект) */
  read(): T {
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed as T;
      return Array.isArray(parsed) ? ([] as any) : ({} as any);
    } catch {
      return [] as any as T;
    }
  }

  /** Полностью перезаписывает содержимое */
  write(data: T): void {
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /** Добавляет элемент, если это массив */
  add(item: any): boolean {
    const data = this.read();

    if (Array.isArray(data)) {
      if (data.some((el) => isEqual(el, item))) return false;
      data.push(item);
      this.write(data as T);
      return true;
    }

    throw new Error('Cannot use add() — storage root is not an array.');
  }

  /** Добавляет или обновляет поле, если это объект */
  set(key: string, value: any): void {
    const data = this.read();

    if (!Array.isArray(data)) {
      (data as Record<string, any>)[key] = value;
      this.write(data as T);
      return;
    }

    throw new Error('Cannot use set() — storage root is an array.');
  }

  /** Удаляет элемент (по фильтру для массива или ключ для объекта) */
  remove(condition: ((el: any) => boolean) | string): boolean {
    const data = this.read();

    if (Array.isArray(data) && typeof condition === 'function') {
      const filtered = data.filter((el) => !condition(el));
      this.write(filtered as T);
      return true;
    }

    if (!Array.isArray(data) && typeof condition === 'string') {
      delete (data as Record<string, any>)[condition];
      this.write(data as T);
      return true;
    }

    throw new Error('Invalid usage of remove(): wrong type or condition.');
  }

  updateIn(fn: (el: any) => boolean, updater: (el: any) => any): void {
    const data = this.read();

    if (!Array.isArray(data)) {
      throw new Error('updateIn() works only with arrays.');
    }

    const index = data.findIndex(fn);
    if (index !== -1) {
      data[index] = updater(data[index]);
      this.write(data as T);
    }
  }

  /** Полностью очищает хранилище */
  clear(): void {
    const data = this.read();
    if (Array.isArray(data)) this.write([] as any);
    else this.write({} as any);
  }
}
