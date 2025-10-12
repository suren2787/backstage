// import React from 'react';
import { createRoot } from 'react-dom/client';
import { KafkaTopologyPage } from './components/KafkaTopologyPage';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<KafkaTopologyPage />);
