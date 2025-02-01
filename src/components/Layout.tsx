import { AppShell, AppShellNavbar, AppShellHeader } from '@mantine/core';
import { Text, UnstyledButton, Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { IconDashboard, IconTemplate, IconCategory, IconPhoto } from '@tabler/icons-react';

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  path: string;
}

function NavLink({ icon, label, path }: NavLinkProps) {
  const navigate = useNavigate();
  
  return (
    <UnstyledButton
      onClick={() => navigate(path)}
      style={(theme) => ({
        display: 'block',
        width: '100%',
        padding: theme.spacing.xs,
        borderRadius: theme.radius.sm,
        '&:hover': {
          backgroundColor: theme.colors.gray[1],
        },
      })}
    >
      <Group>
        {icon}
        <Text size="sm">{label}</Text>
      </Group>
    </UnstyledButton>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuthenticator();

  return (
    <AppShell
      padding="md"
      navbar={{ width: 300, breakpoint: 'sm' }}
      header={{ height: 60 }}
    >
      <AppShellHeader p="xs">
        <Text size="xl" fw={700}>S3 Metadata Manager</Text>
      </AppShellHeader>
      
      <AppShellNavbar p="xs">
        <NavLink icon={<IconDashboard size={16} />} label="Dashboard" path="/" />
        <NavLink icon={<IconTemplate size={16} />} label="Templates" path="/templates" />
        <NavLink icon={<IconCategory size={16} />} label="Categories" path="/categories" />
        <NavLink icon={<IconPhoto size={16} />} label="Images" path="/images" />
        <UnstyledButton onClick={signOut} style={{ marginTop: 'auto' }}>
          Sign Out
        </UnstyledButton>
      </AppShellNavbar>

      {children}
    </AppShell>
  );
}