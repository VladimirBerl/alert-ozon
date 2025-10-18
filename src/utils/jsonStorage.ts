import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import isEqual from 'lodash.isequal';

export default class JsonStorage<T = any> {
  private filePath: string;

  constructor(relativePath: string) {
    this.filePath = path.resolve(`./json/${relativePath}`);
    const dir = path.dirname(this.filePath);

    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(this.filePath)) writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf8');
  }

  read(): T[] {
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  write(data: T[]): void {
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  has(item: T): boolean {
    return this.read().some((el) => isEqual(el, item));
  }

  hasIn(fn: (el: T) => boolean): boolean {
    return this.read().some((el) => fn(el));
  }

  add(item: T): boolean {
    const data = this.read();

    if (this.has(item)) return false;

    data.push(item);
    this.write(data);
    return true;
  }

  addIn(fn: (el: T) => boolean, item: T): boolean {
    const data = this.read();

    if (this.hasIn(fn)) return false;

    data.push(item);
    this.write(data);
    return true;
  }

  getIn(fn: (el: T) => boolean): T | undefined {
    return this.read().find((el) => fn(el));
  }

  updateIn(fn: (el: T) => boolean, updater: (el: T) => T): void {
    const data = this.read();
    const index = data.findIndex(fn);
    if (index !== -1) {
      data[index] = updater(data[index]);
      this.write(data);
    }
  }

  remove(item: T): void {
    const filtered = this.read().filter((el) => !isEqual(el, item));
    this.write(filtered);
  }

  removeIn(fn: (el: T) => boolean): boolean {
    const filtered = this.read().filter((el) => !fn(el));
    this.write(filtered);
    return true;
  }

  removeAll(): void {
    this.write([]);
  }
}
