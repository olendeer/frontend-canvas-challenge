export interface AppStorage {
  read: <TValue>(key: string) => TValue | null;
  remove: (key: string) => void;
  write: <TValue>(key: string, value: TValue) => void;
}
