
export const STORAGE_KEYS = {
  SETTINGS: 'inkflow_settings',
  STUDIO: 'inkflow_studio', // Current active state
  ARCHITECT: 'inkflow_architect', // Current active state
  HISTORY_LAB: 'inkflow_history_lab',
  HISTORY_STUDIO: 'inkflow_history_studio',
  HISTORY_ARCHITECT: 'inkflow_history_architect'
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

// --- History Management ---

export const addHistoryItem = <T extends { id: string }>(key: string, item: T) => {
    const current = loadFromStorage(key) || [];
    // Prepend new item
    const updated = [item, ...current];
    // Limit to last 50 items to prevent localStorage overflow
    if (updated.length > 50) updated.length = 50; 
    saveToStorage(key, updated);
    return updated;
};

export const getHistory = <T>(key: string): T[] => {
    return loadFromStorage(key) || [];
};

export const deleteHistoryItem = <T extends { id: string }>(key: string, id: string): T[] => {
    const current = loadFromStorage(key) || [];
    const updated = current.filter((item: T) => item.id !== id);
    saveToStorage(key, updated);
    return updated;
};
