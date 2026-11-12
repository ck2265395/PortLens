import Store from 'electron-store';
import { appSettingsSchema, defaultSettings, type AppSettings } from '../../shared/settings.js';

export class SettingsStore {
  private readonly store = new Store<AppSettings>({ name: 'settings', defaults: defaultSettings });
  get(): AppSettings { return appSettingsSchema.parse(this.store.store); }
  save(value: AppSettings): AppSettings { const settings = appSettingsSchema.parse(value); this.store.store = settings; return settings; }
}
