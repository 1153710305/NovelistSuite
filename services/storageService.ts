
export const STORAGE_KEYS = {
  SETTINGS: 'inkflow_settings',
  STUDIO: 'inkflow_studio', 
  ARCHITECT: 'inkflow_architect', 
  HISTORY_LAB: 'inkflow_history_lab',
  HISTORY_STUDIO: 'inkflow_history_studio',
  HISTORY_ARCHITECT: 'inkflow_history_architect',
  HISTORY_COVERS: 'inkflow_history_covers', // New Key for Art Studio
  PROMPT_LIB: 'inkflow_prompt_library'
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
    const updated = [item, ...current];
    if (updated.length > 50) updated.length = 50; 
    saveToStorage(key, updated);
    return updated;
};

export const updateHistoryItem = <T extends { id: string }>(key: string, id: string, updates: Partial<T>) => {
    const current = loadFromStorage(key) || [];
    const index = current.findIndex((item: T) => item.id === id);
    
    if (index !== -1) {
        const updatedItem = { ...current[index], ...updates, timestamp: Date.now() };
        const newHistory = [
            updatedItem,
            ...current.slice(0, index),
            ...current.slice(index + 1)
        ];
        saveToStorage(key, newHistory);
        return newHistory;
    }
    return current;
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
