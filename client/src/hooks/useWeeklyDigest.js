import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export function useWeeklyDigest() {
  const [digest, setDigest] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await axios.get('/api/digest/latest');
      setDigest(res.data);
    } catch {
      setDigest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post('/api/agent/digest');
      await fetchLatest();
      return res.data;
    } finally {
      setGenerating(false);
    }
  };

  return { digest, loading, generating, generate, refetch: fetchLatest };
}
