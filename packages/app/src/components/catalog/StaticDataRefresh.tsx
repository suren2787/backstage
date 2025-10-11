import React, { useState } from 'react';
import { Button, Typography, Box } from '@material-ui/core';

export const StaticDataRefresh: React.FC = () => {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/static-data/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Refresh failed');
      setLastSync(new Date().toLocaleString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box mb={2}>
      <Button variant="contained" color="primary" onClick={handleRefresh} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh Static Data'}
      </Button>
      <Box mt={1}>
        <Typography variant="body2">
          Last Sync: {lastSync ? lastSync : 'Never'}
        </Typography>
        {error && <Typography color="error">{error}</Typography>}
      </Box>
    </Box>
  );
};
