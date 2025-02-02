import { Title, Button, SimpleGrid, Card, Stack, Text, Group, Modal, TextInput, NumberInput, Select } from '@mantine/core';
import { IconDownload, IconEdit, IconTrash } from '@tabler/icons-react';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { getUrl, remove } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import type { Category, Template, Image, TemplateField } from '../../types';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

interface CategoryViewProps {
    category: Category;
    template: Template | undefined;
    images: Image[];
    onBack: () => void;
    onUpdate: () => void;
}

export default function CategoryView({ category, template, images, onBack, onUpdate }: CategoryViewProps) {
    const [editingImage, setEditingImage] = useState<Image | null>(null);
    const [editedMetadata, setEditedMetadata] = useState<Record<string, any>>({});

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

    const handleDelete = async (image: Image) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            // Delete from S3
            await remove({
                path: image.s3Key,
                options: {
                    bucket: 's3MetaDataManagement'
                }
            });

            // Delete from database
            await client.models.Image.delete({
                id: image.id
            });

            notifications.show({
                title: 'Success',
                message: 'Image deleted successfully',
                color: 'green',
            });

            onUpdate();
        } catch (error) {
            console.error('Error deleting image:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to delete image',
                color: 'red',
            });
        }
    };

    const handleEdit = (image: Image) => {
        setEditingImage(image);
        setEditedMetadata(JSON.parse(image.metadata));
    };

    const handleSaveEdit = async () => {
        if (!editingImage) return;

        try {
            await client.models.Image.update({
                id: editingImage.id,
                metadata: JSON.stringify(editedMetadata),
            });

            notifications.show({
                title: 'Success',
                message: 'Image metadata updated successfully',
                color: 'green',
            });

            setEditingImage(null);
            onUpdate();
        } catch (error) {
            console.error('Error updating image metadata:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to update image metadata',
                color: 'red',
            });
        }
    };

    const renderMetadataField = (field: TemplateField) => {
        const value = editedMetadata[field.name];

        if (field.type === 'group' && field.fields) {
            return (
                <div key={field.name} style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    backgroundColor: 'white'
                }}>
                    <Text fw={500} mb="xs">{field.name}</Text>
                    <Stack gap="xs">
                        {field.fields.map(subField => renderMetadataField(subField))}
                    </Stack>
                </div>
            );
        }

        switch (field.type) {
            case 'number':
                return (
                    <NumberInput
                        key={field.name}
                        label={field.name}
                        value={value === '' ? '' : Number(value)}
                        onChange={(val) => setEditedMetadata(prev => ({ ...prev, [field.name]: val }))}
                    />
                );
            case 'select':
                return (
                    <Select
                        key={field.name}
                        label={field.name}
                        data={field.options || []}
                        value={value?.toString() || null}
                        onChange={(val) => setEditedMetadata(prev => ({ ...prev, [field.name]: val }))}
                    />
                );
            default:
                return (
                    <TextInput
                        key={field.name}
                        label={field.name}
                        value={value?.toString() || ''}
                        onChange={(e) => setEditedMetadata(prev => ({ ...prev, [field.name]: e.currentTarget.value }))}
                    />
                );
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

                            <Group mt="md">
                                <Button
                                    variant="light"
                                    color="blue"
                                    leftSection={<IconDownload size={14} />}
                                    onClick={() => handleDownload(image)}
                                >
                                    Download
                                </Button>
                                <Button
                                    variant="light"
                                    color="yellow"
                                    leftSection={<IconEdit size={14} />}
                                    onClick={() => handleEdit(image)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="light"
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => handleDelete(image)}
                                >
                                    Delete
                                </Button>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>

            <Modal
                opened={!!editingImage}
                onClose={() => setEditingImage(null)}
                title="Edit Image Metadata"
                size="lg"
            >
                {template && editingImage && (
                    <Stack>
                        {JSON.parse(template.fields).map((field: TemplateField) =>
                            renderMetadataField(field)
                        )}
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </Stack>
                )}
            </Modal>
        </div>
    );
}
