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
      // Call backend directly since proxy isn't working in dev mode
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:7007'
        : '';
      
      // Refresh static data (domains, squads, applications)
      const staticDataRes = await fetch(`${backendUrl}/api/static-data/refresh`, { 
        method: 'POST',
        credentials: 'include',
      });
      if (!staticDataRes.ok) throw new Error(`Static data refresh failed: ${staticDataRes.status} ${staticDataRes.statusText}`);
      const staticDataResult = await staticDataRes.json();
      
      // Refresh Kafka topology (contracts)
      const kafkaTopologyRes = await fetch(`${backendUrl}/api/kafka-topology/refresh`, { 
        method: 'POST',
        credentials: 'include',
      });
      if (!kafkaTopologyRes.ok) throw new Error(`Kafka topology refresh failed: ${kafkaTopologyRes.status} ${kafkaTopologyRes.statusText}`);
      const kafkaTopologyResult = await kafkaTopologyRes.json();
      
      setLastSync(new Date().toLocaleString());
      console.log('Refresh successful:', { 
        staticData: staticDataResult, 
        kafkaTopology: kafkaTopologyResult 
      });
    } catch (e: any) {
      setError(e.message);
      console.error('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box mb={2}>
      <Button variant="contained" color="primary" onClick={handleRefresh} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh All Data'}
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
