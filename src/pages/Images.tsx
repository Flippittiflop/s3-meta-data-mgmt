import { useState, useEffect } from 'react';
import { Title, Button, Select, Stack, Text, Grid, Image as MantineImage, TextInput, NumberInput, Group, Progress } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { generateClient } from 'aws-amplify/data';
import { uploadData } from 'aws-amplify/storage';
import { notifications } from '@mantine/notifications';
import type { Schema } from '../../amplify/data/resource';
import type { Category, Template, TemplateField } from '../types';

const client = generateClient<Schema>();

interface UploadedImage {
  file: File;
  preview: string;
  metadata: Record<string, any>;
  uploadProgress?: number;
}

export default function Images() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, []);

  const loadCategories = async () => {
    try {
      const result = await client.models.Category.list();
      setCategories(result.data.map(category => ({
        id: category.id,
        name: category.name || '',
        templateId: category.templateId || ''
      })));
    } catch (error) {
      console.error('Error loading categories:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load categories',
        color: 'red',
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await client.models.Template.list();
      setTemplates(result.data.map(template => ({
        id: template.id,
        name: template.name || '',
        fields: template.fields || '[]'
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load templates',
        color: 'red',
      });
    }
  };

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
      updated[index] = {
        ...updated[index],
        uploadProgress: progress,
      };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedCategory) return;

    setIsUploading(true);
    try {
      await Promise.all(
          uploadedImages.map(async (img, index) => {
            // Upload to S3
            const key = `${selectedCategory}/${Date.now()}-${img.file.name}`;
            try {
              const uploadResult = await uploadData({
                key,
                data: img.file,
                options: {
                  bucket: 's3MetaDataManagement',
                  onProgress: ({ transferredBytes, totalBytes }) => {
                    const progress = (transferredBytes / totalBytes) * 100;
                    updateUploadProgress(index, progress);
                  },
                },
              }).result;

              // Create image record in DynamoDB
              await client.models.Image.create({
                s3Key: key,
                s3Url: uploadResult.key, // The S3 URL will be constructed from the key
                categoryId: selectedCategory,
                metadata: JSON.stringify(img.metadata),
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
    const fieldName = prefix ? `${prefix}.${field.name}` : field.name;
    const value = uploadedImages[imageIndex]?.metadata[fieldName] || '';

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
                value={value}
                onChange={(val) => handleMetadataChange(imageIndex, fieldName, val)}
            />
        );
      case 'select':
        return (
            <Select
                key={fieldName}
                label={field.name}
                data={field.options || []}
                value={value}
                onChange={(val) => handleMetadataChange(imageIndex, fieldName, val)}
            />
        );
      default:
        return (
            <TextInput
                key={fieldName}
                label={field.name}
                value={value}
                onChange={(e) => handleMetadataChange(imageIndex, fieldName, e.currentTarget.value)}
            />
        );
    }
  };

  return (
      <div>
        <Title order={1} mb="xl">Images</Title>

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
                    maxSize={5 * 1024 ** 2} // 5MB
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
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <MantineImage
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            fit="contain"
                            h={200}
                        />
                        {typeof image.uploadProgress === 'number' && (
                            <Progress
                                value={image.uploadProgress}
                                mt="md"
                                color={image.uploadProgress === 100 ? 'green' : 'blue'}
                            />
                        )}
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 8 }}>
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
