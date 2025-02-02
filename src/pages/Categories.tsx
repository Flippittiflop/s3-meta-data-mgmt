import { useState, useEffect } from 'react';
import { Title, Button, TextInput, Select, Stack, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconDeviceFloppy } from '@tabler/icons-react';
import type { Schema } from '../../amplify/data/resource';
import type { Template, Category } from '../types';

const client = generateClient<Schema>();

export default function Categories() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      templateId: '',
    },
  });

  useEffect(() => {
    loadTemplates();
    loadCategories();
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

  const loadCategories = async () => {
    try {
      const result = await client.models.Category.list();
      if (!result.data) return;

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

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    form.setValues({
      name: category.name,
      templateId: category.templateId,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    form.reset();
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingId) {
        const result = await client.models.Category.update({
          id: editingId,
          name: values.name,
          templateId: values.templateId,
        });

        if (!result.data) {
          throw new Error('Failed to update category');
        }

        notifications.show({
          title: 'Success',
          message: 'Category updated successfully',
          color: 'green',
        });

        setEditingId(null);
      } else {
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
      }

      form.reset();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save category',
        color: 'red',
      });
    }
  };

  return (
      <div>
        <Title order={1} mb="xl">Categories</Title>

        <div style={{
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #eee',
          marginBottom: '2rem'
        }}>
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
                {editingId && (
                    <Button variant="light" onClick={cancelEditing}>
                      Cancel
                    </Button>
                )}
                <Button type="submit" leftSection={editingId ? <IconDeviceFloppy size={14} /> : <IconPlus size={14} />}>
                  {editingId ? 'Save Changes' : 'Create Category'}
                </Button>
              </Group>
            </Stack>
          </form>
        </div>

        {categories.length > 0 && (
            <Stack mt="xl">
              <Title order={2}>Existing Categories</Title>
              {categories.map(category => {
                const template = templates.find(t => t.id === category.templateId);
                return (
                    <div key={category.id} style={{
                      padding: '2rem',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #eee'
                    }}>
                      <Group justify="space-between" mb="md">
                        <div>
                          <Title order={3}>{category.name}</Title>
                          <Text size="sm" c="dimmed">Template: {template?.name || 'Unknown'}</Text>
                        </div>
                        <Button
                            variant="light"
                            leftSection={<IconEdit size={14} />}
                            onClick={() => startEditing(category)}
                        >
                          Edit
                        </Button>
                      </Group>
                    </div>
                );
              })}
            </Stack>
        )}
      </div>
  );
}
