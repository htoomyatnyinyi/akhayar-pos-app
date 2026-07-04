// utils/validation.ts
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/[^0-9]/g, ""));
};

export const validateTenantCode = (code: string): boolean => {
  const codeRegex = /^[A-Z0-9-]{2,24}$/;
  return codeRegex.test(code);
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const validateCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};
