
export const STORAGE_KEYS = {
  SETTINGS: 'inkflow_settings',
  STUDIO: 'inkflow_studio',
  ARCHITECT: 'inkflow_architect'
};

export const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
};

export const loadFromStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Failed to load from local storage', e);
    return null;
  }
};
