import { Title, Button, SimpleGrid, Card, Stack, Text, Group } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { getUrl } from 'aws-amplify/storage';
import { notifications } from '@mantine/notifications';
import type { Category, Template, Image, TemplateField } from '../../types';

interface CategoryViewProps {
    category: Category;
    template: Template | undefined;
    images: Image[];
    onBack: () => void;
}

export default function CategoryView({ category, template, images, onBack }: CategoryViewProps) {
    const handleDownload = async (image: Image) => {
        try {
            const result = await getUrl({
                path: image.s3Key,
                options: {
                    bucket: 's3MetaDataManagement',
                    validateObjectExistence: true,
                    expiresIn: 300,
                }
            });

            if (result.url) {
                const link = document.createElement('a');
                link.href = result.url.toString();
                link.download = image.s3Key.split('/').pop() || 'image';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error downloading image:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to download image',
                color: 'red',
            });
        }
    };

    return (
        <div>
            <Stack>
                <Group justify="space-between">
                    <Title order={2}>{category.name}</Title>
                    <Button variant="light" onClick={onBack}>
                        Back to Categories
                    </Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {images.map(image => (
                        <Card
                            key={image.id}
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            withBorder
                        >
                            <Card.Section>
                                <StorageImage
                                    path={image.s3Key}
                                    alt="Image"
                                    style={{
                                        width: '100%',
                                        height: '200px',
                                        objectFit: 'cover'
                                    }}
                                />
                            </Card.Section>

                            {template && (
                                <Stack mt="md">
                                    {JSON.parse(template.fields).map((field: TemplateField) => {
                                        const metadata = JSON.parse(image.metadata);
                                        return (
                                            <Text key={field.name} size="sm">
                                                <strong>{field.name}:</strong> {metadata[field.name] || 'N/A'}
                                            </Text>
                                        );
                                    })}
                                </Stack>
                            )}

                            <Button
                                variant="light"
                                color="blue"
                                fullWidth
                                mt="md"
                                leftSection={<IconDownload size={14} />}
                                onClick={() => handleDownload(image)}
                            >
                                Download
                            </Button>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>
        </div>
    );
}
