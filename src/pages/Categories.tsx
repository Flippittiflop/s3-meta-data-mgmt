import { useState, useEffect } from 'react';
import { Title, Button, TextInput, Select, Stack, Group, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconDeviceFloppy, IconTrash } from '@tabler/icons-react';
import type { Schema } from '../../amplify/data/resource';
import type { Template, Category } from '../types';

const client = generateClient<Schema>();

export default function Categories() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>({});

  const form = useForm({
    initialValues: {
      name: '',
      templateId: '',
    },
  });

  useEffect(() => {
    loadTemplates();
    loadCategories();
    loadCategoryUsage();
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

  const loadCategoryUsage = async () => {
    try {
      const result = await client.models.Image.list();
      const usage: Record<string, number> = {};

      result.data.forEach(image => {
        if (image.categoryId) {
          usage[image.categoryId] = (usage[image.categoryId] || 0) + 1;
        }
      });

      setCategoryUsage(usage);
    } catch (error) {
      console.error('Error loading category usage:', error);
    }
  };

  const handleDelete = async (categoryId: string) => {
    // Check if category is in use
    if (categoryUsage[categoryId]) {
      notifications.show({
        title: 'Cannot Delete',
        message: `This category contains ${categoryUsage[categoryId]} ${
            categoryUsage[categoryId] === 1 ? 'image' : 'images'
        }. Remove all images from this category first.`,
        color: 'red',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await client.models.Category.delete({
        id: categoryId
      });

      notifications.show({
        title: 'Success',
        message: 'Category deleted successfully',
        color: 'green',
      });

      loadCategories();
      loadCategoryUsage();
    } catch (error) {
      console.error('Error deleting category:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete category',
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
      loadCategoryUsage();
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
                          <Group gap="xs">
                            <Text size="sm" c="dimmed">Template: {template?.name || 'Unknown'}</Text>
                            {categoryUsage[category.id] > 0 && (
                                <Text size="sm" c="dimmed">
                                  • Contains {categoryUsage[category.id]} {categoryUsage[category.id] === 1 ? 'image' : 'images'}
                                </Text>
                            )}
                          </Group>
                        </div>
                        <Group>
                          <Button
                              variant="light"
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => handleDelete(category.id)}
                              disabled={categoryUsage[category.id] > 0}
                              title={categoryUsage[category.id] > 0 ? 'Cannot delete category while it contains images' : 'Delete category'}
                          >
                            Delete
                          </Button>
                          <Button
                              variant="light"
                              leftSection={<IconEdit size={14} />}
                              onClick={() => startEditing(category)}
                          >
                            Edit
                          </Button>
                        </Group>
                      </Group>
                    </div>
                );
              })}
            </Stack>
        )}
      </div>
  );
}
