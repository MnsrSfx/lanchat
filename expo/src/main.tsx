import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('main', () => App);

const rootTag = document.getElementById('root');
if (rootTag) {
  const root = createRoot(rootTag);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
