export const formatDateDDMMYYYY = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB').format(date).replace(/\//g, '-');
};
