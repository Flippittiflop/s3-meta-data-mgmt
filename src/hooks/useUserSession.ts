import { useState, useEffect } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { decodeJWT } from '@aws-amplify/core';

export interface UserInfo {
    email: string;
    groups: string[];
    name: string;
}

export function useUserSession() {
    const [userInfo, setUserInfo] = useState<UserInfo>({
        email: '',
        groups: [],
        name: ''
    });

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        try {
            // Get user attributes and session
            const [attributes, session] = await Promise.all([
                fetchUserAttributes(),
                fetchAuthSession()
            ]);

            // Get groups from access token
            let groups: string[] = [];

            if (session.tokens?.accessToken) {
                const decoded = decodeJWT(session.tokens.accessToken.toString());
                const cognitoGroups = decoded.payload['cognito:groups'];
                if (cognitoGroups && Array.isArray(cognitoGroups)) {
                    groups = cognitoGroups.filter(group => typeof group === 'string');
                }
            }

            // Get user info from attributes
            const email = attributes.email || '';
            const name = attributes.nickname || attributes.name || email.split('@')[0];

            setUserInfo({
                email,
                groups,
                name
            });
        } catch (error) {
            console.error('Error loading user info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const hasGroup = (group: string) => userInfo.groups.includes(group);
    const hasAnyGroup = (groups: string[]) => groups.some(group => userInfo.groups.includes(group));
    const hasAllGroups = (groups: string[]) => groups.every(group => userInfo.groups.includes(group));

    return {
        userInfo,
        isLoading,
        hasGroup,
        hasAnyGroup,
        hasAllGroups,
        refreshUserInfo: loadUserInfo
    };
}
