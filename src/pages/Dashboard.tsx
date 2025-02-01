import { Container, Title, SimpleGrid, Card, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconTemplate, IconCategory, IconPhoto } from '@tabler/icons-react';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <Container>
      <Title order={1} mb="xl">Dashboard</Title>
      <SimpleGrid cols={3}>
        <Card 
          shadow="sm" 
          padding="lg" 
          radius="md" 
          withBorder 
          onClick={() => navigate('/templates')}
          style={{ cursor: 'pointer' }}
        >
          <IconTemplate size={32} />
          <Text size="xl" mt="md">Templates</Text>
          <Text size="sm" c="dimmed">Manage metadata templates</Text>
        </Card>

        <Card 
          shadow="sm" 
          padding="lg" 
          radius="md" 
          withBorder 
          onClick={() => navigate('/categories')}
          style={{ cursor: 'pointer' }}
        >
          <IconCategory size={32} />
          <Text size="xl" mt="md">Categories</Text>
          <Text size="sm" c="dimmed">Organize your images</Text>
        </Card>

        <Card 
          shadow="sm" 
          padding="lg" 
          radius="md" 
          withBorder 
          onClick={() => navigate('/images')}
          style={{ cursor: 'pointer' }}
        >
          <IconPhoto size={32} />
          <Text size="xl" mt="md">Images</Text>
          <Text size="sm" c="dimmed">Upload and manage images</Text>
        </Card>
      </SimpleGrid>
    </Container>
  );
}