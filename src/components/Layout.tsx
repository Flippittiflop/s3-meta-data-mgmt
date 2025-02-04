import { Group, Text, UnstyledButton } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { IconDashboard, IconTemplate, IconCategory, IconPhoto, IconLogout } from '@tabler/icons-react';

interface NavLinkProps {
    icon: React.ReactNode;
    label: string;
    path: string;
}

function NavLink({ icon, label, path }: NavLinkProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === path;

    return (
        <UnstyledButton
            onClick={() => navigate(path)}
            style={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: theme.radius.sm,
                backgroundColor: isActive ? theme.colors.gray[1] : 'transparent',
                '&:hover': {
                    backgroundColor: theme.colors.gray[1],
                },
            })}
        >
            {icon}
            <Text size="sm">{label}</Text>
        </UnstyledButton>
    );
}

export default function Layout({ children }: { children: React.ReactNode }) {
    const { signOut } = useAuthenticator();

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderBottom: '1px solid #eee',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{
                    maxWidth: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}>
                    <Text size="xl" fw={700}>Image Meta Data Manager</Text>

                    <Group gap="xs" wrap="nowrap" style={{ overflowX: 'auto', flex: 1, justifyContent: 'center' }}>
                        <NavLink icon={<IconDashboard size={16} />} label="Dashboard" path="/" />
                        <NavLink icon={<IconTemplate size={16} />} label="Templates" path="/templates" />
                        <NavLink icon={<IconCategory size={16} />} label="Categories" path="/categories" />
                        <NavLink icon={<IconPhoto size={16} />} label="Images" path="/images" />
                    </Group>

                    <UnstyledButton
                        onClick={signOut}
                        style={(theme) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: theme.radius.sm,
                            color: theme.colors.red[6],
                            '&:hover': {
                                backgroundColor: theme.colors.red[0],
                            },
                        })}
                    >
                        <IconLogout size={16} />
                        <Text size="sm">Sign Out</Text>
                    </UnstyledButton>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1,
                padding: '2rem',
                backgroundColor: '#f8f9fa',
                width: '100%',
                maxWidth: '100%',
            }}>
                {children}
            </main>
        </div>
    );
}
