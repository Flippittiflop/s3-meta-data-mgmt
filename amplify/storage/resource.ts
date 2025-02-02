import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 's3MetaDataManagement',
    access: (allow) => ({
        'media-files/*': [
            allow.guest.to(['read']),
            allow.authenticated.to(['read','write']),
            allow.entity('identity').to(['read', 'write', 'delete'])
        ]
    })
});
