export const formatTimestamp = (value) => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export const getServiceStatusColor = (status) => {
  return status === 'ok' ? '#0f766e' : '#b91c1c';
};
