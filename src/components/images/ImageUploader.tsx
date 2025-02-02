import { useState } from 'react';
import { Button, Select, Stack, Text, Grid, TextInput, NumberInput, Group, Progress } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { generateClient } from 'aws-amplify/data';
import { uploadData } from 'aws-amplify/storage';
import { notifications } from '@mantine/notifications';
import type { Schema } from '../../../amplify/data/resource';
import type { Category, Template, TemplateField } from '../../types';

const client = generateClient<Schema>();

interface UploadedImage {
    file: File;
    preview: string;
    metadata: Record<string, any>;
    uploadProgress?: number;
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
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            metadata: {},
        }));
        setUploadedImages(prev => [...prev, ...newImages]);
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
                    const key = `media-files/${category.name}/${Date.now()}-${img.file.name}`;

                    // Convert metadata to S3-compatible format
                    const s3Metadata: Record<string, string> = {};
                    Object.entries(img.metadata || {}).forEach(([key, value]) => {
                        // S3 metadata keys must be lowercase
                        const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        // Convert all values to strings
                        s3Metadata[sanitizedKey] = String(value || '');
                    });

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

                        await client.models.Image.create({
                            s3Key: key,
                            s3Url: key,
                            categoryId: selectedCategory,
                            metadata: JSON.stringify(img.metadata || {}),
                        });
                    } catch (error) {
                        console.error(`Error uploading image ${img.file.name}:`, error);
                        throw error;
                    }
                })
            );

            notifications.show({
                title: 'Success',
                message: 'Images uploaded and saved successfully',
                color: 'green',
            });

            setUploadedImages([]);
            onUploadComplete(selectedCategory);
        } catch (error) {
            console.error('Error saving images:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to save images',
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
                            accept={['image/*']}
                            maxSize={5 * 1024 ** 2}
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
                                    Drag images here or click to select files
                                </Text>
                            </Stack>
                        </Dropzone>
                    )}
                </Stack>
            </div>

            {uploadedImages.length > 0 && (
                <>
                    {uploadedImages.map((image, index) => (
                        <div key={index} style={{
                            padding: '2rem',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '1px solid #eee',
                            marginBottom: '2rem'
                        }}>
                            <Grid>
                                <Grid.Col span={{base: 12, md: 4}}>
                                    <img
                                        src={image.preview}
                                        alt={`Preview ${index + 1}`}
                                        style={{
                                            width: '100%',
                                            height: '200px',
                                            objectFit: 'contain'
                                        }}
                                    />
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
                    ))}

                    <Group justify="center" mt="xl">
                        <Button
                            size="lg"
                            onClick={handleSave}
                            loading={isUploading}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Save All Images'}
                        </Button>
                    </Group>
                </>
            )}
        </div>
    );
}

