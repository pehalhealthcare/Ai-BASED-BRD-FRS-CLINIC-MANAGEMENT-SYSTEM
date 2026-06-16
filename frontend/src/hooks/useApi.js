import { useCallback, useState } from 'react';

const useApi = (requestFn) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError('');

      try {
        return await requestFn(...args);
      } catch (requestError) {
        setError(requestError?.message || 'Request failed.');
        throw requestError;
      } finally {
        setLoading(false);
      }
    },
    [requestFn]
  );

  return {
    loading,
    error,
    execute,
    setError
  };
};

export default useApi;
