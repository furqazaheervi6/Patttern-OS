import { useState, useEffect } from 'react';
import axios from 'axios';

export function useCalendar() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState({ credentials_exist: false, authorized: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [evRes, stRes] = await Promise.all([
          axios.get('/api/google/upcoming'),
          axios.get('/api/google/status'),
        ]);
        setEvents(evRes.data.events || []);
        setStatus(stRes.data);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return { events, status, loading };
}
