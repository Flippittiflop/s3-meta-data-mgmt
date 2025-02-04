import { useState, useEffect } from 'react';
import { Title, Button, TextInput, Stack, Group, Select, ActionIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { generateClient } from 'aws-amplify/data';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEdit, IconDeviceFloppy } from '@tabler/icons-react';
import type { Schema } from '../../amplify/data/resource';
import type { Template, TemplateField } from '../types';

const client = generateClient<Schema>();

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'group', label: 'Group' }
] as const;

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateUsage, setTemplateUsage] = useState<Record<string, number>>({});

  const form = useForm({
    initialValues: {
      name: '',
      fields: [] as TemplateField[],
    },
    validate: {
      name: (value) => (!value ? 'Template name is required' : null),
    },
  });

  useEffect(() => {
    loadTemplates();
    loadTemplateUsage();
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

  const loadTemplateUsage = async () => {
    try {
      const result = await client.models.Category.list();
      const usage: Record<string, number> = {};

      result.data.forEach(category => {
        if (category.templateId) {
          usage[category.templateId] = (usage[category.templateId] || 0) + 1;
        }
      });

      setTemplateUsage(usage);
    } catch (error) {
      console.error('Error loading template usage:', error);
    }
  };

  const handleDelete = async (templateId: string) => {
    // Check if template is in use
    if (templateUsage[templateId]) {
      notifications.show({
        title: 'Cannot Delete',
        message: `This template is being used by ${templateUsage[templateId]} ${
            templateUsage[templateId] === 1 ? 'category' : 'categories'
        }. Remove all categories using this template first.`,
        color: 'red',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await client.models.Template.delete({
        id: templateId
      });

      notifications.show({
        title: 'Success',
        message: 'Template deleted successfully',
        color: 'green',
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete template',
        color: 'red',
      });
    }
  };

  const startEditing = (template: Template) => {
    setEditingId(template.id);
    form.setValues({
      name: template.name,
      fields: JSON.parse(template.fields),
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    form.reset();
  };

  const addField = (path: string = 'fields') => {
    form.insertListItem(path, {
      name: '',
      type: 'text',
      options: [],
      fields: [],
    });
  };

  const removeField = (path: string, index: number) => {
    form.removeListItem(path, index);
  };

  const renderFields = (fields: TemplateField[], path: string = 'fields') => {
    return fields.map((field, index) => (
        <div key={index} style={{
          padding: '1rem',
          marginBottom: '1rem',
          border: '1px solid #eee',
          borderRadius: '8px',
          backgroundColor: 'white'
        }}>
          <Group align="flex-start">
            <TextInput
                label="Field Name"
                placeholder="Enter field name"
                required
                style={{ flex: 1 }}
                {...form.getInputProps(`${path}.${index}.name`)}
            />
            <Select
                label="Field Type"
                data={FIELD_TYPES}
                required
                style={{ width: 120 }}
                {...form.getInputProps(`${path}.${index}.type`)}
            />
            <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removeField(path, index)}
                mt={28}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>

          {field.type === 'select' && (
              <TextInput
                  label="Options (comma-separated)"
                  placeholder="Option1, Option2, Option3"
                  mt="sm"
                  value={field.options?.join(', ') || ''}
                  onChange={(event) => {
                    const options = event.currentTarget.value.split(',').map(opt => opt.trim());
                    form.setFieldValue(`${path}.${index}.options`, options);
                  }}
              />
          )}

          {field.type === 'group' && (
              <Stack mt="sm">
                <Button
                    leftSection={<IconPlus size={14} />}
                    variant="light"
                    size="xs"
                    onClick={() => addField(`${path}.${index}.fields`)}
                >
                  Add Nested Field
                </Button>
                {renderFields(field.fields || [], `${path}.${index}.fields`)}
              </Stack>
          )}
        </div>
    ));
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingId) {
        const result = await client.models.Template.update({
          id: editingId,
          name: values.name,
          fields: JSON.stringify(values.fields || []),
        });

        if (!result.data) {
          throw new Error('Failed to update template');
        }

        notifications.show({
          title: 'Success',
          message: 'Template updated successfully',
          color: 'green',
        });

        setEditingId(null);
      } else {
        const result = await client.models.Template.create({
          name: values.name,
          fields: JSON.stringify(values.fields || []),
        });

        if (!result.data) {
          throw new Error('Failed to create template');
        }

        notifications.show({
          title: 'Success',
          message: 'Template created successfully',
          color: 'green',
        });
      }

      form.reset();
      loadTemplates();
      loadTemplateUsage();
    } catch (error) {
      console.error('Error saving template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save template. Please try again.',
        color: 'red',
      });
    }
  };

  return (
      <div>
        <Title order={1} mb="xl">Templates</Title>

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
                  label="Template Name"
                  placeholder="Enter template name"
                  required
                  {...form.getInputProps('name')}
              />

              <Button
                  leftSection={<IconPlus size={14} />}
                  variant="light"
                  onClick={() => addField()}
              >
                Add Field
              </Button>

              {renderFields(form.values.fields)}

              <Group justify="flex-end">
                {editingId && (
                    <Button variant="light" onClick={cancelEditing}>
                      Cancel
                    </Button>
                )}
                <Button type="submit" leftSection={editingId ? <IconDeviceFloppy size={14} /> : <IconPlus size={14} />}>
                  {editingId ? 'Save Changes' : 'Create Template'}
                </Button>
              </Group>
            </Stack>
          </form>
        </div>

        {templates.length > 0 && (
            <Stack mt="xl">
              <Title order={2}>Existing Templates</Title>
              {templates.map(template => (
                  <div key={template.id} style={{
                    padding: '2rem',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #eee'
                  }}>
                    <Group justify="space-between" mb="md">
                      <div>
                        <Title order={3}>{template.name}</Title>
                        <Group gap="xs">
                          <span>Fields: {JSON.parse(template.fields).length}</span>
                          {templateUsage[template.id] > 0 && (
                              <span style={{ color: '#666' }}>
                              • Used by {templateUsage[template.id]} {templateUsage[template.id] === 1 ? 'category' : 'categories'}
                            </span>
                          )}
                        </Group>
                      </div>
                      <Group>
                        <Button
                            variant="light"
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleDelete(template.id)}
                            disabled={templateUsage[template.id] > 0}
                            title={templateUsage[template.id] > 0 ? 'Cannot delete template while in use' : 'Delete template'}
                        >
                          Delete
                        </Button>
                        <Button
                            variant="light"
                            leftSection={<IconEdit size={14} />}
                            onClick={() => startEditing(template)}
                        >
                          Edit
                        </Button>
                      </Group>
                    </Group>
                  </div>
              ))}
            </Stack>
        )}
      </div>
  );
}
