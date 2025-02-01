import { useState, useEffect } from 'react';
import { Container, Title, Button, Card, TextInput, Select, Stack, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import type { Schema } from '../../amplify/data/resource';
import type { Template } from '../types';

const client = generateClient<Schema>();

export default function Categories() {
  const [templates, setTemplates] = useState<Template[]>([]);

  const form = useForm({
    initialValues: {
      name: '',
      templateId: '',
    },
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const result = await client.models.Template.list();
      if (!result.data) return;
      
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

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const result = await client.models.Category.create({
        name: values.name,
        templateId: values.templateId,
      });
      
      if (!result.data) {
        throw new Error('Failed to create category');
      }

      notifications.show({
        title: 'Success',
        message: 'Category created successfully',
        color: 'green',
      });
      
      form.reset();
    } catch (error) {
      console.error('Error creating category:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create category',
        color: 'red',
      });
    }
  };

  return (
    <Container>
      <Title order={1} mb="xl">Categories</Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Category Name"
              placeholder="Enter category name"
              required
              {...form.getInputProps('name')}
            />
            <Select
              label="Template"
              placeholder="Select a template"
              data={templates.map(template => ({
                value: template.id,
                label: template.name,
              }))}
              required
              {...form.getInputProps('templateId')}
            />
            <Group justify="flex-end">
              <Button type="submit">Create Category</Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}