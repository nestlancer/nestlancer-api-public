/** Mock for uuid v7 and common functions with uniqueness */
let counter = 0;

export const v7 = () => {
  counter++;
  return `00000000-0000-7000-8000-${counter.toString(16).padStart(12, '0')}`;
};

export const v4 = () => {
  counter++;
  return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, '0')}`;
};

export const validate = (uuid: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
export const NIL = '00000000-0000-0000-0000-000000000000';

export default {
  v7,
  v4,
  validate,
  NIL,
};
