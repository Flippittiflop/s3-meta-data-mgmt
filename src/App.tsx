import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import Categories from './pages/Categories';
import Images from './pages/Images';

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <Authenticator hideSignUp={true}>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/images" element={<Images />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </Authenticator>
    </MantineProvider>
  );
}

export default App;