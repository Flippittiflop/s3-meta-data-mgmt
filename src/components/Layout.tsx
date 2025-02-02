import { AppShell, AppShellNavbar, AppShellHeader, Burger, Group } from '@mantine/core';
import { Text, UnstyledButton } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { IconDashboard, IconTemplate, IconCategory, IconPhoto } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  onClick?: () => void;
}

function NavLink({ icon, label, path, onClick }: NavLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
      <UnstyledButton
          onClick={() => {
            navigate(path);
            if (onClick) onClick();
          }}
          style={(theme) => ({
            display: 'block',
            width: '100%',
            padding: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            backgroundColor: isActive ? theme.colors.gray[1] : 'transparent',
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
  const [opened, { toggle, close }] = useDisclosure();

  const handleNavClick = () => {
    // Close the navbar on mobile after clicking a link
    close();
  };

  return (
      <AppShell
          header={{ height: 60 }}
          navbar={{
            width: 300,
            breakpoint: 'sm',
            collapsed: { mobile: !opened, desktop: false }
          }}
          padding="md"
      >
        <AppShellHeader p="xs">
          <Group h="100%" px="md" justify="space-between">
            <Text size="xl" fw={700}>S3 Metadata Manager</Text>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
        </AppShellHeader>

        <AppShellNavbar p="xs">
          <NavLink
              icon={<IconDashboard size={16} />}
              label="Dashboard"
              path="/"
              onClick={handleNavClick}
          />
          <NavLink
              icon={<IconTemplate size={16} />}
              label="Templates"
              path="/templates"
              onClick={handleNavClick}
          />
          <NavLink
              icon={<IconCategory size={16} />}
              label="Categories"
              path="/categories"
              onClick={handleNavClick}
          />
          <NavLink
              icon={<IconPhoto size={16} />}
              label="Images"
              path="/images"
              onClick={handleNavClick}
          />
          <UnstyledButton
              onClick={() => {
                handleNavClick();
                signOut();
              }}
              style={{ marginTop: 'auto', padding: '0.5rem' }}
          >
            Sign Out
          </UnstyledButton>
        </AppShellNavbar>

        {children}
      </AppShell>
  );
}
