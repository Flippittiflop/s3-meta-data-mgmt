import { Title, SimpleGrid, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconTemplate, IconCategory, IconPhoto } from '@tabler/icons-react';

function DashboardCard({
                         icon,
                         title,
                         description,
                         onClick
                       }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
      <div
          onClick={onClick}
          style={{
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #eee',
            backgroundColor: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}
      >
        {icon}
        <Text size="xl" mt="md">{title}</Text>
        <Text size="sm" c="dimmed">{description}</Text>
      </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  return (
      <div>
        <Title order={1} mb="xl">Dashboard</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          <DashboardCard
              icon={<IconTemplate size={32} />}
              title="Templates"
              description="Manage metadata templates"
              onClick={() => navigate('/templates')}
          />
          <DashboardCard
              icon={<IconCategory size={32} />}
              title="Categories"
              description="Organize your images"
              onClick={() => navigate('/categories')}
          />
          <DashboardCard
              icon={<IconPhoto size={32} />}
              title="Images"
              description="Upload and manage images"
              onClick={() => navigate('/images')}
          />
        </SimpleGrid>
      </div>
  );
}
