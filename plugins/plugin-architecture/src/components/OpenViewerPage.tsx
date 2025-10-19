import React from 'react';
import { Button } from '@material-ui/core';

export const OpenViewerPage: React.FC = () => {
  const backendUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:7007` : 'http://localhost:7007';

  const openViewer = () => {
    const url = `${backendUrl}/api/architecture/viewer`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Bounded Context Viewer</h1>
      <p>This page opens the architecture viewer served by the backend in a new tab to avoid framing/CSP issues.</p>
      <Button variant="contained" color="primary" onClick={openViewer}>
        Open Viewer in new tab
      </Button>
    </div>
  );
};

export default OpenViewerPage;
