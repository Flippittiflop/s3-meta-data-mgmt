import { useUserSession } from './useUserSession';

export function usePermissions() {
    const { hasGroup } = useUserSession();

    return {
        canManageTemplates: () => hasGroup('ADMINS'),
        canManageCategories: () => hasGroup('ADMINS'),
        canManageImages: () => true, // Everyone can manage images
    };
}
