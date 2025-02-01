import { useState, useEffect } from 'react';
import { Container, Title, Button, Card, Select, Stack, Text, Grid, Image as MantineImage, TextInput, NumberInput, Group } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import type { Schema } from '../../amplify/data/resource';
import type { Category, Template, TemplateField } from '../types';

const client = generateClient<Schema>();

interface UploadedImage {
  file: File;
  preview: string;
  metadata: Record<string, any>;
}

export default function Images() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

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

  const renderMetadataField = (field: TemplateField, imageIndex: number, prefix = '') => {
    const fieldName = prefix ? `${prefix}.${field.name}` : field.name;
    const value = uploadedImages[imageIndex]?.metadata[fieldName] || '';

    if (field.type === 'group' && field.fields) {
      return (
        <Card key={fieldName} withBorder p="xs" mb="xs">
          <Text fw={500} mb="xs">{field.name}</Text>
          <Stack gap="xs">
            {field.fields.map(subField => renderMetadataField(subField, imageIndex, fieldName))}
          </Stack>
        </Card>
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

  const handleSave = async () => {
    try {
      await Promise.all(
        uploadedImages.map(async (img) => {
          // In a real implementation, we would upload to S3 here
          const dummyS3Url = `https://dummy-s3-bucket.s3.amazonaws.com/${img.file.name}`;
          
          await client.models.Image.create({
            s3Key: img.file.name,
            s3Url: dummyS3Url,
            categoryId: selectedCategory!,
            metadata: JSON.stringify(img.metadata),
          });
        })
      );

      notifications.show({
        title: 'Success',
        message: 'Images saved successfully',
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
    }
  };

  return (
    <Container>
      <Title order={1} mb="xl">Images</Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
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
      </Card>

      {uploadedImages.length > 0 && (
        <>
          {uploadedImages.map((image, index) => (
            <Card key={index} shadow="sm" padding="lg" radius="md" withBorder mb="xl">
              <Grid>
                <Grid.Col span={4}>
                  <MantineImage
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    fit="contain"
                    h={200}
                  />
                </Grid.Col>
                <Grid.Col span={8}>
                  <Stack>
                    {selectedTemplate && JSON.parse(selectedTemplate.fields).map((field: TemplateField) => 
                      renderMetadataField(field, index)
                    )}
                  </Stack>
                </Grid.Col>
              </Grid>
            </Card>
          ))}

          <Group justify="center" mt="xl">
            <Button size="lg" onClick={handleSave}>
              Save All Images
            </Button>
          </Group>
        </>
      )}
    </Container>
  );
}