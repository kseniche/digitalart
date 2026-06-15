/**
 * Лимиты полей (клиент). Синхронизированы с config/field_limits.php
 */
export const FIELD_LIMITS = {
  post: {
    title: { min: 1, max: 255 },
    description: { min: 1, max: 50000 },
  },
  comment: {
    content: { min: 1, max: 2000 },
  },
  commentReport: {
    otherText: { min: 0, max: 1000 },
  },
  postReport: {
    otherText: { min: 0, max: 1000 },
  },
  profile: {
    name: { min: 1, max: 255 },
    userSurname: { min: 0, max: 255 },
    username: { min: 3, max: 255 },
    email: { min: 0, max: 255 },
    phone: { min: 0, max: 16 },
    website: { min: 0, max: 255 },
    bio: { min: 0, max: 2000 },
  },
  auth: {
    firstName: { min: 1, max: 255 },
    lastName: { min: 1, max: 255 },
    username: { min: 3, max: 255 },
    email: { min: 0, max: 255 },
    password: { min: 8, max: 255 },
  },
};

/** Порог предупреждения (доля от max) */
export const CHAR_COUNTER_WARN_RATIO = 0.9;
