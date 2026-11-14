const KEY = "plan-floor-design:config:v1";

export const loadSaved = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const save = (text) => {
  try { localStorage.setItem(KEY, text); } catch { /* storage unavailable, ignore */ }
};
export const clearSaved = () => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};
