import React from 'react';
import { StaticDataRefresh } from './catalog/StaticDataRefresh';
import { Box, Typography } from '@material-ui/core';

export const SettingsStaticDataRefresh: React.FC = () => (
  <Box mt={4}>
    <Typography variant="h6" gutterBottom>
      Static Data Sync
    </Typography>
    <StaticDataRefresh />
    <Typography variant="body2" color="textSecondary">
      Use this to manually refresh static-data from GitHub and update the catalog. Last sync time is shown below.
    </Typography>
  </Box>
);
