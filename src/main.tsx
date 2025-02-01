import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import "./index.css";
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs.json';

// Configure Amplify with the generated config
Amplify.configure(config, {
  ssr: false
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);