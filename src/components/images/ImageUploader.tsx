import { useState } from 'react';
import { Button, Select, Stack, Text, Grid, TextInput, NumberInput, Group, Progress, Checkbox, ActionIcon } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconTrash, IconGripVertical } from '@tabler/icons-react';
import { generateClient } from 'aws-amplify/data';
import { uploadData } from 'aws-amplify/storage';
import { notifications } from '@mantine/notifications';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { Schema } from '../../../amplify/data/resource';
import type { Category, Template, TemplateField } from '../../types';

const client = generateClient<Schema>();

interface UploadedImage {
    file: File;
    preview: string;
    metadata: Record<string, any>;
    uploadProgress?: number;
    isActive: boolean;
    sequence: number;
}

interface ImageUploaderProps {
    categories: Category[];
    templates: Template[];
    onUploadComplete: (categoryId: string) => void;
}

export default function ImageUploader({ categories, templates, onUploadComplete }: ImageUploaderProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleCategoryChange = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
        if (categoryId) {
            const category = categories.find(c => c.id === categoryId);
            if (category) {
                const template = templates.find(t => t.id === category.templateId);
                setSelectedTemplate(template || null);
            }
        }
    };

    const handleDrop = (files: File[]) => {
        const newImages = files.map((file, index) => ({
            file,
            preview: file.type.startsWith('video/')
                ? URL.createObjectURL(file)
                : URL.createObjectURL(file),
            metadata: {},
            isActive: true,
            sequence: uploadedImages.length + index
        }));
        setUploadedImages(prev => [...prev, ...newImages]);
    };

    const handleDeleteImage = (index: number) => {
        setUploadedImages(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview); // Clean up the preview URL
            updated.splice(index, 1);
            // Update sequences
            return updated.map((img, idx) => ({ ...img, sequence: idx }));
        });
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(uploadedImages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update sequences after reordering
        const updatedItems = items.map((item, index) => ({
            ...item,
            sequence: index
        }));

        setUploadedImages(updatedItems);
    };

    const handleToggleActive = (index: number) => {
        setUploadedImages(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], isActive: !updated[index].isActive };
            return updated;
        });
    };

    const handleMetadataChange = (imageIndex: number, field: string, value: any) => {
        setUploadedImages(prev => {
            const updated = [...prev];
            if (!updated[imageIndex]) return prev;

            updated[imageIndex] = {
                ...updated[imageIndex],
                metadata: {
                    ...updated[imageIndex].metadata,
                    [field]: value,
                },
            };
            return updated;
        });
    };

    const updateUploadProgress = (index: number, progress: number) => {
        setUploadedImages(prev => {
            const updated = [...prev];
            if (!updated[index]) return prev;

            updated[index] = {
                ...updated[index],
                uploadProgress: progress,
            };
            return updated;
        });
    };

    const handleSave = async () => {
        if (!selectedCategory) return;

        const category = categories.find(c => c.id === selectedCategory);
        if (!category) return;

        setIsUploading(true);
        try {
            await Promise.all(
                uploadedImages.map(async (img, index) => {
                    const key = `media-files/${category.name.toLowerCase()}/${Date.now()}-${img.file.name}`;

                    // Convert metadata to S3-compatible format and add isActive and sequence
                    const s3Metadata = {
                        'is-active': String(img.isActive),
                        'sequence': String(img.sequence),
                        ...Object.entries(img.metadata || {}).reduce((acc, [key, value]) => {
                            const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
                            acc[sanitizedKey] = String(value || '');
                            return acc;
                        }, {} as Record<string, string>)
                    };

                    try {
                        await uploadData({
                            path: key,
                            data: img.file,
                            options: {
                                bucket: 's3MetaDataManagement',
                                metadata: s3Metadata,
                                onProgress: ({ transferredBytes, totalBytes }) => {
                                    if (!totalBytes) return;
                                    const progress = (transferredBytes / totalBytes) * 100;
                                    updateUploadProgress(index, progress);
                                },
                            },
                        });

                        // Create image record in DynamoDB
                        await client.models.Image.create({
                            s3Key: key,
                            s3Url: key,
                            categoryId: selectedCategory,
                            metadata: JSON.stringify(img.metadata || {}),
                            isActive: img.isActive,
                            sequence: img.sequence
                        });
                    } catch (error) {
                        console.error(`Error uploading image ${img.file.name}:`, error);
                        throw error;
                    }
                })
            );

            notifications.show({
                title: 'Success',
                message: 'Files uploaded and saved successfully',
                color: 'green',
            });

            setUploadedImages([]);
            onUploadComplete(selectedCategory);
        } catch (error) {
            console.error('Error saving files:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to save files',
                color: 'red',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const renderMetadataField = (field: TemplateField, imageIndex: number, prefix = '') => {
        if (!uploadedImages[imageIndex]) return null;

        const fieldName = prefix ? `${prefix}.${field.name}` : field.name;
        const metadata = uploadedImages[imageIndex].metadata || {};
        const value = metadata[fieldName] ?? '';

        if (field.type === 'group' && field.fields) {
            return (
                <div key={fieldName} style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    backgroundColor: 'white'
                }}>
                    <Text fw={500} mb="xs">{field.name}</Text>
                    <Stack gap="xs">
                        {field.fields.map(subField => renderMetadataField(subField, imageIndex, fieldName))}
                    </Stack>
                </div>
            );
        }

        switch (field.type) {
            case 'number':
                return (
                    <NumberInput
                        key={fieldName}
                        label={field.name}
                        value={value === '' ? '' : Number(value)}
                        onChange={(val) => handleMetadataChange(imageIndex, fieldName, val)}
                    />
                );
            case 'select':
                return (
                    <Select
                        key={fieldName}
                        label={field.name}
                        data={field.options || []}
                        value={value?.toString() || null}
                        onChange={(val) => handleMetadataChange(imageIndex, fieldName, val)}
                    />
                );
            default:
                return (
                    <TextInput
                        key={fieldName}
                        label={field.name}
                        value={value?.toString() || ''}
                        onChange={(e) => handleMetadataChange(imageIndex, fieldName, e.currentTarget.value)}
                    />
                );
        }
    };

    return (
        <div>
            <div style={{
                padding: '2rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #eee',
                marginBottom: '2rem'
            }}>
                <Stack>
                    <Select
                        label="Category"
                        placeholder="Select a category"
                        data={categories.map(category => ({
                            value: category.id,
                            label: category.name,
                        }))}
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        required
                    />

                    {selectedCategory && (
                        <Dropzone
                            onDrop={handleDrop}
                            accept={{
                                'image/*': [], // Accept all image types
                                'video/mp4': ['.mp4'] // Accept MP4 videos
                            }}
                            maxSize={100 * 1024 ** 2} // Increased to 100MB to accommodate videos
                            disabled={isUploading}
                        >
                            <Stack align="center" gap="xs" style={{ minHeight: 120, justifyContent: 'center' }}>
                                <Dropzone.Accept>
                                    <IconUpload size={32} />
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                    <IconX size={32} />
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                    <IconPhoto size={32} />
                                </Dropzone.Idle>
                                <Text size="sm" inline>
                                    Drag images or MP4 videos here or click to select files
                                </Text>
                            </Stack>
                        </Dropzone>
                    )}
                </Stack>
            </div>

            {uploadedImages.length > 0 && (
                <>
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="images">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {uploadedImages.map((image, index) => (
                                        <Draggable key={index} draggableId={`image-${index}`} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        padding: '2rem',
                                                        backgroundColor: 'white',
                                                        borderRadius: '8px',
                                                        border: '1px solid #eee',
                                                        marginBottom: '2rem',
                                                        ...provided.draggableProps.style
                                                    }}
                                                >
                                                    <Grid>
                                                        <Grid.Col span={{base: 12, md: 4}}>
                                                            <Group mb="md">
                                                                <div {...provided.dragHandleProps}>
                                                                    <IconGripVertical size={24} style={{ cursor: 'grab' }} />
                                                                </div>
                                                                <Checkbox
                                                                    label="Active"
                                                                    checked={image.isActive}
                                                                    onChange={() => handleToggleActive(index)}
                                                                />
                                                                <ActionIcon
                                                                    color="red"
                                                                    variant="subtle"
                                                                    onClick={() => handleDeleteImage(index)}
                                                                >
                                                                    <IconTrash size={16} />
                                                                </ActionIcon>
                                                            </Group>
                                                            {image.file.type.startsWith('video/') ? (
                                                                <video
                                                                    src={image.preview}
                                                                    controls
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '200px',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={image.preview}
                                                                    alt={`Preview ${index + 1}`}
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '200px',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                />
                                                            )}
                                                            {typeof image.uploadProgress === 'number' && (
                                                                <Progress
                                                                    value={image.uploadProgress}
                                                                    mt="md"
                                                                    color={image.uploadProgress === 100 ? 'green' : 'blue'}
                                                                />
                                                            )}
                                                        </Grid.Col>
                                                        <Grid.Col span={{base: 12, md: 8}}>
                                                            <Stack>
                                                                {selectedTemplate && JSON.parse(selectedTemplate.fields).map((field: TemplateField) =>
                                                                    renderMetadataField(field, index)
                                                                )}
                                                            </Stack>
                                                        </Grid.Col>
                                                    </Grid>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    <Group justify="center" mt="xl">
                        <Button
                            size="lg"
                            onClick={handleSave}
                            loading={isUploading}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Save All Files'}
                        </Button>
                    </Group>
                </>
            )}
        </div>
    );
}
