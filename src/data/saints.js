export const SAINTS = {
  "1-21": "St. Agnes",
  "1-24": "St. Francis de Sales",
  "1-28": "St. Thomas Aquinas",
  "1-31": "St. John Bosco",
  "2-14": "St. Valentine",
  "3-19": "St. Joseph",
  "10-4": "St. Francis of Assisi",
  "11-1": "All Saints Day",
  "12-12": "Our Lady of Guadalupe",
  // Fallback for dates not listed:
  "default": "St. Teresa of Calcutta" 
};

export const getSaint = (date) => {
  const key = `${date.getMonth() + 1}-${date.getDate()}`;
  return SAINTS[key] || "Daily Saint";
};