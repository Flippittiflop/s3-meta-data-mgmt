import { Title, Button, SimpleGrid, Card, Stack, Text, Group, Modal, TextInput, NumberInput, Select, Checkbox } from '@mantine/core';
import { IconDownload, IconEdit, IconTrash, IconGripVertical, IconDeviceFloppy } from '@tabler/icons-react';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { getUrl, remove } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

export default function CategoryView({ category, template, images: initialImages, onBack, onUpdate }: CategoryViewProps) {
    const [editingImage, setEditingImage] = useState<Image | null>(null);
    const [editedMetadata, setEditedMetadata] = useState<Record<string, any>>({});
    const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
    const [images, setImages] = useState<Image[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        // Sort images by sequence when they're loaded
        const sortedImages = [...initialImages].sort((a, b) =>
            (a.sequence || 0) - (b.sequence || 0)
        );
        setImages(sortedImages);
    }, [initialImages]);

    useEffect(() => {
        // Load URLs for all media files
        const loadMediaUrls = async () => {
            const urls: Record<string, string> = {};
            for (const image of images) {
                try {
                    const result = await getUrl({
                        path: image.s3Key,
                        options: {
                            bucket: 's3MetaDataManagement',
                            validateObjectExistence: true,
                            expiresIn: 3600,
                        }
                    });
                    if (result.url) {
                        urls[image.id] = result.url.toString();
                    }
                } catch (error) {
                    console.error('Error loading media URL:', error);
                }
            }
            setMediaUrls(urls);
        };

        loadMediaUrls();
    }, [images]);

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(images);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update sequences
        const updatedItems = items.map((item, index) => ({
            ...item,
            sequence: index
        }));

        setImages(updatedItems);
        setHasUnsavedChanges(true);
    };

    const handleToggleActive = (image: Image) => {
        setImages(prev => prev.map(img =>
            img.id === image.id
                ? { ...img, isActive: !img.isActive }
                : img
        ));
        setHasUnsavedChanges(true);
    };

    const handleSaveChanges = async () => {
        try {
            // Update all images in DynamoDB
            await Promise.all(images.map(async (image) => {
                await client.models.Image.update({
                    id: image.id,
                    isActive: image.isActive,
                    sequence: image.sequence,
                });
            }));

            notifications.show({
                title: 'Success',
                message: 'Changes saved successfully',
                color: 'green',
            });

            setHasUnsavedChanges(false);
            onUpdate();
        } catch (error) {
            console.error('Error saving changes:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to save changes',
                color: 'red',
            });
        }
    };

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
                link.download = image.s3Key.split('/').pop() || 'media';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to download file',
                color: 'red',
            });
        }
    };

    const handleDelete = async (image: Image) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

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
                message: 'File deleted successfully',
                color: 'green',
            });

            onUpdate();
        } catch (error) {
            console.error('Error deleting file:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to delete file',
                color: 'red',
            });
        }
    };

    const handleEdit = (image: Image) => {
        setEditingImage(image);
        try {
            const metadata = JSON.parse(image.metadata);
            setEditedMetadata(metadata || {});
        } catch (error) {
            console.error('Error parsing metadata:', error);
            setEditedMetadata({});
        }
    };

    const handleSaveEdit = async () => {
        if (!editingImage) return;

        try {
            // Update DynamoDB
            await client.models.Image.update({
                id: editingImage.id,
                metadata: JSON.stringify(editedMetadata),
            });

            notifications.show({
                title: 'Success',
                message: 'File metadata updated successfully',
                color: 'green',
            });

            setEditingImage(null);
            onUpdate();
        } catch (error) {
            console.error('Error updating file metadata:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to update file metadata',
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
                const numberValue = value === undefined || value === null || value === '' ? '' : Number(value);
                return (
                    <NumberInput
                        key={field.name}
                        label={field.name}
                        value={numberValue}
                        onChange={(newValue) => {
                            setEditedMetadata(prev => ({
                                ...prev,
                                [field.name]: newValue === '' ? null : newValue
                            }));
                        }}
                        allowNegative={true}
                        allowDecimal={true}
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
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setEditedMetadata(prev => ({ ...prev, [field.name]: newValue }));
                        }}
                    />
                );
        }
    };

    const isVideo = (key: string) => {
        const extension = key.split('.').pop()?.toLowerCase();
        return extension === 'mp4';
    };

    return (
        <div>
            <Stack>
                <Group justify="space-between">
                    <Title order={2}>{category.name}</Title>
                    <Group>
                        <Button
                            variant="light"
                            color="blue"
                            leftSection={<IconDeviceFloppy size={14} />}
                            onClick={handleSaveChanges}
                            disabled={!hasUnsavedChanges}
                        >
                            Save Changes
                        </Button>
                        <Button variant="light" onClick={onBack}>
                            Back to Categories
                        </Button>
                    </Group>
                </Group>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="images">
                        {(provided) => (
                            <SimpleGrid
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                cols={{ base: 1, sm: 2, lg: 3 }}
                                spacing="lg"
                            >
                                {images.map((image, index) => (
                                    <Draggable key={image.id} draggableId={image.id} index={index}>
                                        {(provided) => (
                                            <Card
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                shadow="sm"
                                                padding="lg"
                                                radius="md"
                                                withBorder
                                                style={provided.draggableProps.style}
                                            >
                                                <Group mb="md">
                                                    <div {...provided.dragHandleProps}>
                                                        <IconGripVertical size={24} style={{ cursor: 'grab' }} />
                                                    </div>
                                                    <Checkbox
                                                        label="Active"
                                                        checked={image.isActive}
                                                        onChange={() => handleToggleActive(image)}
                                                    />
                                                </Group>

                                                <Card.Section>
                                                    {isVideo(image.s3Key) ? (
                                                        mediaUrls[image.id] ? (
                                                            <video
                                                                src={mediaUrls[image.id]}
                                                                controls
                                                                style={{
                                                                    width: '100%',
                                                                    height: '200px',
                                                                    objectFit: 'contain'
                                                                }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: '100%',
                                                                height: '200px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: '#f8f9fa'
                                                            }}>
                                                                Loading video...
                                                            </div>
                                                        )
                                                    ) : (
                                                        <StorageImage
                                                            path={image.s3Key}
                                                            alt="Image"
                                                            style={{
                                                                width: '100%',
                                                                height: '200px',
                                                                objectFit: 'contain'
                                                            }}
                                                        />
                                                    )}
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
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </SimpleGrid>
                        )}
                    </Droppable>
                </DragDropContext>
            </Stack>

            <Modal
                opened={!!editingImage}
                onClose={() => setEditingImage(null)}
                title="Edit File Metadata"
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
